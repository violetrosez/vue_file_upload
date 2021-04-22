self.importScripts("/spark-md5.min.js");
// console.log(SparkMD5);
self.onmessage = function(d) {
  let { chunks } = d.data;
  console.log(d);
  const spark = new self.SparkMD5.ArrayBuffer();
  let index = 0;

  let fileReader = new FileReader();
  fileReader.onerror = function() {
    console.warn("oops, something went wrong.");
  };
  fileReader.onload = function(e) {
    console.log("read chunk nr", index + 1);
    spark.append(e.target.result); // Append array buffer
    index++;

    if (index < chunks.length) {
      loadNext();
      self.postMessage({
        msg: index + " loaded",
      });
    } else {
      console.log("finished loading");
      console.info("computed hash", spark.end()); // Compute hash
      self.postMessage({
        hash: 100,
      });
    }
  };
  function loadNext() {
    fileReader.readAsArrayBuffer(chunks[index]);
  }

  loadNext();
};
