let koa = require("koa");
let router = require("koa-router")(); //koa 路由

let fs = require("fs");
let path = require("path");

//处理文件上传的插件
let koaBody = require("koa-body");

const cors = require("koa-cors"); // 解决跨域
const { Promise } = require("core-js");

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
app.use(async (ctx, next) => {
  try {
    await next();
    if (ctx.status == 404) {
      ctx.body = "404";
    } else {
      console.log(ctx.url);
    }
  } catch (error) {
    throw new Error(error);
  }
});

router.post("/upload", async (ctx) => {
  // 获取上传文件
  const file = ctx.request.files.chunk;
  const { hash, index } = ctx.request.body;
  // 读取文件流
  const fileReader = fs.createReadStream(file.path);
  // 设置文件保存路径
  const filePath = path.join(__dirname, `/static/${hash}/`);

  // 判断文件夹是否存在，如果不在的话就创建一个
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }

  // 保存的文件名
  const fileResource = filePath + `${hash}-${index}`;
  const writeStream = fs.createWriteStream(fileResource);

  fileReader.pipe(writeStream);

  ctx.body = {
    code: 0,
    message: "上传成功",
  };
});

router.post("/merge", async (ctx) => {
  let { hash, size, format } = JSON.parse(ctx.request.body);
  const filePath = path.join(__dirname, `/static/${hash}/`);
  console.log(hash);
  let chunks = fs.readdirSync(filePath);

  chunks = chunks.sort((a, b) => {
    return a.split("-")[0] - b.split("-")[0];
  });

  let tasks = [];
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];

    let p = new Promise((resolve) => {
      const fileReader = fs.createReadStream(`${filePath}/${chunk}`);
      const writeStream = fs.createWriteStream(
        path.join(__dirname, `/static/file/${hash}.${format}`),
        {
          start: index * size,
        }
      );
      fileReader.pipe(writeStream);
      fileReader.on("end", function() {
        //1删掉切片
        fs.unlinkSync(`${filePath}/${chunk}`);
        resolve();
      });
    });

    tasks.push(p);
  }
  //2切片传输完成，删除文件夹
  Promise.all(tasks)
    .then(() => {
      fs.rmdirSync(filePath);
    })
    .catch((e) => {
      console.log(e);
    });
  // fs.readdir(filePath, () => {});

  ctx.body = {
    code: 0,
    message: "合并成功",
  };
});

//判断文件是否已存在
router.post("/exist", async (ctx) => {
  let { hash } = JSON.parse(ctx.request.body);
  const filePath = path.join(__dirname, `/static/file/${hash}`);
  if (fs.existsSync(filePath)) {
    ctx.body = {
      data: { exist: true },
      code: 0,
    };
  } else {
    ctx.body = {
      data: { exist: false },
      code: 0,
    };
  }
});

/**
 * 已上传的切片
 */
router.post("/remainfiles", async (ctx) => {
  let { hash } = JSON.parse(ctx.request.body);
  const filePath = path.join(__dirname, `/static/${hash}/`);
  if (!fs.existsSync(filePath)) {
    ctx.body = {
      data: [],
      code: 0,
    };
  } else {
    let files = fs.readdirSync(filePath);
    ctx.body = {
      data: files,
      code: 0,
    };
  }
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

app.on("error", (err) => {
  console.error("Ooops..\n", err);
});
