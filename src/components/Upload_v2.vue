<template>
  <div style="width: 400px">
    <div class="content" ref="drop">
      <i class="el-icon-upload" style="font-size: 26px"></i>
      拖拽文件到此处上传
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
      progress: 0,
    };
  },
  mounted() {
    const dropbox = this.$refs.drop;

    //监听拖拽事件

    dropbox.addEventListener(
      "dragleave",
      () => {
        dropbox.style.backgroundColor = "transparent";
      },
      false
    );
    dropbox.addEventListener(
      "dragenter",
      (e) => {
        e.stopPropagation();
        e.preventDefault();
      },
      false
    );
    dropbox.addEventListener(
      "dragover",
      (e) => {
        e.stopPropagation();
        e.preventDefault();
        dropbox.style.backgroundColor = "rgba(64,158,255,0.8)";
      },
      false
    );
    dropbox.addEventListener(
      "drop",
      (e) => {
        e.stopPropagation();
        e.preventDefault();
        //获取文件
        let file = e.dataTransfer.files[0];
        //处理上传逻辑
        this.handleUpload(file);
        dropbox.style.backgroundColor = "transparent";
      },
      false
    );
  },
  methods: {
    /**
     * 上传
     */
    handleUpload(file) {
      let formData = new FormData();
      formData.append("file", file);

      let xhr = new XMLHttpRequest();
      console.time();
      //监听进度
      xhr.upload.onprogress = (e) => {
        this.progress = parseInt(String((e.loaded / e.total) * 100));
      };

      xhr.open("post", "http://localhost:3000/upload");

      xhr.send(formData);

      xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.status == 200) {
          console.timeEnd();
          this.$message({
            message: "上传成功",
            type: "success",
          });
        }
      };
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
