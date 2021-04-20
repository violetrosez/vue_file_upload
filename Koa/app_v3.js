let koa = require("koa");
let router = require("koa-router")(); //koa 路由

let fs = require("fs");
let path = require("path");

//处理文件上传的插件
let koaBody = require("koa-body");

const cors = require("koa-cors"); // 解决跨域
const { log } = require("console");

let app = new koa();

app.use(cors());

//文件上传
app.use(
  koaBody({
    multipart: true, // 支持文件上传
    formidable: {
      // uploadDir: path.join(__dirname, 'static/file/'), // 设置文件上传目录
      keepExtensions: true, // 保持文件的后缀
      // maxFieldsSize: 2 * 1024 * 1024, // 文件上传大小，缺省2M
    },
  })
);

//中间件
//洋葱模型
app.use(async (ctx, next) => {
  await next();
  if (ctx.status == 404) {
    ctx.body = "404 not found";
  } else {
    ctx.body = {
      code: 0,
      message: "成功",
    };
  }
});

router.post("/upload", async (ctx) => {
  // 获取上传文件
  const file = ctx.request.files.chunk;
  const { filename, index } = ctx.request.body;

  // 读取文件流
  const fileReader = fs.createReadStream(file.path);

  // 设置文件保存路径
  const filePath = path.join(__dirname, `/static/${filename}/`);
  // 组装成绝对路径
  const fileResource = path.join(filePath, `${index}-${filename}`);

  /**
   * 使用 createWriteStream 写入数据，然后使用管道流pipe拼接
   */
  const writeStream = fs.createWriteStream(fileResource);
  // 判断文件夹是否存在，如果不在的话就创建一个
  if (!fs.existsSync(filePath)) {
    fs.mkdir(filePath, async (err) => {
      if (err) {
        throw new Error(err);
      } else {
        await fileReader.pipe(writeStream);
        ctx.body = {
          file: filename,
          code: 0,
          message: "上传成功",
        };
      }
    });
  } else {
    await fileReader.pipe(writeStream);
    ctx.status = 200;
    ctx.body = {
      file: filename,
      code: 0,
      message: "上传成功",
    };
  }
});

router.post("/merge", async (ctx) => {
  let { filename, size } = JSON.parse(ctx.request.body);
  const filePath = path.join(__dirname, `/static/${filename}/`);
  fs.readdir(filePath, async (err, chunks) => {
    if (err) {
      throw new Error(err);
    }

    chunks = chunks.sort((a, b) => {
      return a.split("-")[0] - b.split("-")[0];
    });

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const fileReader = fs.createReadStream(`${filePath}/${chunk}`);

      const writeStream = fs.createWriteStream(`${filePath}/${filename}`, {
        start: index * size,
      });
      await fileReader.pipe(writeStream);
      fs.rm(`${filePath}/${chunk}`, () => {
        // console.log(`删除了${chunk}`);
      });
    }

    ctx.body = {
      code: 0,
      message: "合并成功",
    };
  });
});
app.use(router.routes()); /*启动路由*/
app.use(router.allowedMethods());
/*
 * router.allowedMethods()作用： 这是官方文档的推荐用法,我们可以
 * 看到 router.allowedMethods()用在了路由匹配 router.routes()之后,所以在当所有
 * 路由中间件最后调用.此时根据 ctx.status 设置 response 响应头
 *
 */
app.listen(3000, () => {
  console.log("start listen port 3000");
});
