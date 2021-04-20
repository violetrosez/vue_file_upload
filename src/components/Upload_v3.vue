<template>
  <div class="content" ref="drop">
    <input type="file" name="file" id="file" />
    <el-button size="small" type="primary" @click="handleUpload"
      >点击上传</el-button
    >
  </div>
</template>
<script>
export default {
  data() {
    return {
      progress: 0,
    };
  },

  methods: {
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

    requestUpload(data) {
      return new Promise((resolve) => {
        let formData = new FormData();
        formData.append("chunk", data.chunk);
        formData.append("index", data.index);
        formData.append("filename", data.filename);
        let xhr = new XMLHttpRequest();

        // //监听进度
        // xhr.upload.onprogress = (e) => {
        //   this.progress = parseInt(String((e.loaded / e.total) * 100));
        // };

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
     * 上传
     */
    handleUpload() {
      let file = document.getElementById("file").files[0];

      let chunks = this.sliceFile(file);
      console.log(chunks);
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
      //发起合并请求
      Promise.all(tasks).then(() => {
        let xhr = new XMLHttpRequest();
        xhr.open("post", "http://localhost:3000/merge");
        let file = document.getElementById("file").files[0];
        xhr.send(JSON.stringify({ filename: file.name, size: chunks[0].size }));
        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4 && xhr.status == 200) {
            this.$message({
              message: "上传成功",
              type: "success",
            });
          }
        };
      });
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
