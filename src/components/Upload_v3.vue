<template>
  <div>
    <div class="content" ref="drop">
      <input type="file" name="file" id="file" @change="addFile2Ctx" />
      <el-button size="small" type="primary" @click="handleUpload"
        >点击上传</el-button
      >
    </div>
    <el-progress
      :text-inside="true"
      :stroke-width="16"
      :percentage="progress"
    ></el-progress>
  </div>
</template>
<script>
export default {
  data() {
    return {
      fileCtx: null, //文件对象
      progressArr: [], //每个切片的进度
    };
  },

  methods: {
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
    sliceFile(file, chunkSize = 1024 * 1024 * 5) {
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
        formData.append("filename", data.filename);
        let xhr = new XMLHttpRequest();
        this.progressArr = [];
        //监听进度
        xhr.upload.onprogress = (e) => {
          this.$set(this.progressArr, data.index, e.loaded); //加载了多少
        };

        xhr.open("post", "http://localhost:3000/upload");

        xhr.send(formData);

        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4 && xhr.status == 200) {
            resolve(xhr.responseText);
          }
        };
      });
    },

    /**
     * 处理upload
     */
    handleUpload() {
      let file = this.fileCtx;
      if (file == null) {
        alert("无文件");
        return;
      }
      let chunks = this.sliceFile(file);

      let tasks = [];
      for (let index = 0; index < chunks.length; index++) {
        tasks.push(
          this.requestUpload({
            chunk: chunks[index],
            index,
            filename: file.name,
          })
        );
      }
      console.time();
      //发起合并请求
      Promise.all(tasks).then(() => {
        console.timeEnd();
        let xhr = new XMLHttpRequest();
        xhr.open("post", "http://localhost:3000/merge");

        xhr.send(
          JSON.stringify({ filename: this.fileCtx.name, size: chunks[0].size })
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
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}
</style>
