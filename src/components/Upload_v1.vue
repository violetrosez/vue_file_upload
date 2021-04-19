<template>
  <div class="content">
    <!-- element -->
    <!-- <el-upload
      class="upload-demo"
      action="http://localhost:3000/upload"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :before-remove="beforeRemove"
      multiple
      :limit="3"
      :on-exceed="handleExceed"
      :file-list="fileList"
    >
      <el-button size="small" type="primary">点击上传</el-button>
     
    </el-upload> -->


    <form action="http://localhost:3000/upload" method="POST" enctype="multipart/form-data"> 
      <input type="file" name="file" id="file"/>
      <input type="submit" value="提交">
    </form>
  </div>
</template>
<script>
export default {
  data() {
    return {
      fileList: [],
    };
  },
  methods: {

    handleUpload() {
      let file = document.getElementById('file').files[0];
      console.log(file);
    },

    handleRemove(file, fileList) {
      console.log(file, fileList);
    },
    handlePreview(file) {
      console.log(file);
    },
    handleExceed(files, fileList) {
      this.$message.warning(
        `当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${
          files.length + fileList.length
        } 个文件`
      );
    },
    beforeRemove(file, fileList) {
      console.log(fileList);
      return this.$confirm(`确定移除 ${file.name}？`);
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
}
</style>
