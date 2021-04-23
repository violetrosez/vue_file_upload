<template>
  <div>
    <div class="content" ref="drop">
      <input type="file" name="file" id="file" @change="addFile2Ctx" />
      <el-button size="small" type="primary" @click="handleUpload"
        >点击上传</el-button
      >
      <el-button
        size="small"
        type="primary"
        @click="stopReq"
        v-if="state == 'stop'"
        >暂停</el-button
      >
      <el-button size="small" type="primary" @click="reStart" v-else
        >恢复</el-button
      >
    </div>

    <el-progress
      :text-inside="true"
      :stroke-width="16"
      :percentage="progress"
    ></el-progress>
    <p>node Koa/app_v4.js</p>
  </div>
</template>
<script>
import SparkMD5 from "spark-md5";
export default {
  data() {
    return {
      fileCtx: null, //文件对象
      progressArr: [], //每个切片的进度
      requestArr: [], //并发请求
      state: "stop",
    };
  },

  methods: {
    stopReq() {
      this.requestArr.forEach((e) => {
        e.abort();
      });
      this.requestArr = [];
    },
    reStart() {
      this.handleUpload();
    },
    /**
     * change事件
     */
    addFile2Ctx() {
      this.fileCtx = document.getElementById("file").files[0];
    },
    /**
     * 文件切片方法
     * 文件
     * 切片大小
     */
    sliceFile(file, chunkSize = 1024 * 1024 * 10) {
      let total = file.size;
      let start = 0,
        end = 0;
      let chunks = []; //存储切片的数组
      while (end < total) {
        start = end;
        end += chunkSize;
        let chunkData = file.slice(start, end);
        chunks.push(chunkData);
      }
      return chunks;
    },

    /**
     * 请求上传
     */
    requestUpload(data) {
      return new Promise((resolve) => {
        let formData = new FormData();
        formData.append("chunk", data.chunk);
        formData.append("index", data.index);
        formData.append("hash", data.hash);
        let xhr = new XMLHttpRequest();

        //监听进度
        xhr.upload.onprogress = (e) => {
          this.$set(this.progressArr, data.index, e.loaded); //加载了多少
        };

        xhr.open("post", "http://localhost:3000/upload");

        xhr.send(formData);

        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4 && xhr.status == 200) {
            let idx = this.requestArr.findIndex((e) => e == xhr);
            this.requestArr.splice(idx, 1);
            resolve(xhr.responseText);
          }
        };
        this.requestArr.push(xhr);
      });
    },

    /**
     * 校验文件格式
     */
    validateFileType(file) {
      const map = new Map();

      map.set("0000001C66747970", "mp4"); //mp4
      map.set("0000001866747970", "mp4"); //mp4

      let reader = new FileReader();
      reader.readAsArrayBuffer(file); //读取二进制流
      return new Promise((resolve) => {
        reader.onload = function (event) {
          try {
            let buffer = new Uint8Array(event.target.result);
            buffer = buffer.slice(0, 8);

            let headBuffer = Array.from(buffer)
              .map((e) => {
                return e.toString(16).toUpperCase().padStart(2, "0");
              })
              .join("");

            let type = map.get(headBuffer);

            resolve(type);
          } catch (error) {
            throw new Error(error);
          }
        };
      });
    },

    /**
     * 处理upload
     */
    async handleUpload() {
      let file = this.fileCtx;
      if (file == null) {
        alert("无文件");
        return;
      }
      let type = await this.validateFileType(file);
      if (type !== "mp4") {
        alert("格式不支持");
        return;
      }
      console.time();
      let chunks = this.sliceFile(file);

      // calc hash
      let hash = await this.calcHashByWebWorker(chunks);

      // get remain files
      let remainfiles = await this.getRemainFile(hash);
      console.timeEnd();
      // this.progressArr = [];
      let tasks = [];
      for (let index = 0; index < chunks.length; index++) {
        try {
          if (remainfiles.includes(`${hash}-${index}`)) continue;
          tasks.push(
            this.requestUpload({
              chunk: chunks[index],
              index,
              hash: hash,
            })
          );
        } catch (error) {
          console.log(error);
        }
      }

      //发起合并请求
      Promise.all(tasks).then(() => {
        let xhr = new XMLHttpRequest();
        xhr.open("post", "http://localhost:3000/merge");
        // // let type = this.fileCtx.name;
        // console.log(this.fileCtx);
        xhr.send(
          JSON.stringify({ hash: hash, size: chunks[0].size, format: type })
        );
        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4 && xhr.status == 200) {
            this.$message({
              message: "合并成功",
              type: "success",
            });
          }
        };
      });
    },

    /**
     * 计算hash
     */
    calcHash(chunks) {
      return new Promise((resolve) => {
        const spark = new SparkMD5.ArrayBuffer();
        let index = 0;

        let fileReader = new FileReader();
        fileReader.onerror = function () {
          console.warn("oops, something went wrong.");
        };
        fileReader.onload = function (e) {
          console.log("read chunk nr", index + 1);
          spark.append(e.target.result); // Append array buffer
          index++;

          if (index < chunks.length) {
            loadNext();
          } else {
            console.log("finished loading");
            console.info("computed hash", spark.end()); // Compute hash
            resolve(spark.end());
          }
        };
        function loadNext() {
          fileReader.readAsArrayBuffer(chunks[index]);
        }

        loadNext();
      });
    },

    calcHashByWebWorker(chunks) {
      return new Promise((resolve) => {
        let worker = new Worker("/web-worker.js");
        worker.postMessage({ chunks });
        worker.onmessage = (e) => {
          console.log("hash计算进度----" + e.data.percent + "%");
          if (e.data.msg == "loaded") {
            console.info("computed hash", e.data.hash); // Compute hash
            resolve(e.data.hash);
          }
        };
      });
    },

    /**
     * 文件是否存在服务器
     */

    checkIfExist(hash) {
      return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("post", "http://localhost:3000/exist");
        xhr.responseType = "json";
        xhr.send(JSON.stringify({ hash }));
        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4 && xhr.status == 200) {
            // console.log(xhr.response.data);

            if (xhr.response.data.exist) {
              this.$message({
                message: "文件已存在",
                type: "success",
              });
            }
            resolve(xhr.response.data.exist);
          }
        };
      });
    },

    getRemainFile(hash) {
      return new Promise((resolve) => {
        let xhr = new XMLHttpRequest();
        xhr.open("post", "http://localhost:3000/remainfiles");
        xhr.responseType = "json";
        xhr.send(JSON.stringify({ hash }));
        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4 && xhr.status == 200) {
            console.log(xhr.response.data);

            resolve(xhr.response.data);
          }
        };
      });
    },
  },

  computed: {
    progress() {
      if (!this.fileCtx || !this.progressArr.length) return 0;

      let loaded = this.progressArr.reduce((toal, cur) => toal + cur);

      return parseInt(((loaded * 100) / this.fileCtx.size).toFixed(2));
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.content {
  width: 400px;
  height: 400px;
  border: 1px dashed #ccc;
  display: flex;
  padding: 20px;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}
</style>
