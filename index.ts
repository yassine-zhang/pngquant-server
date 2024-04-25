import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import express, { type Request, type Response } from "express"
import cors from "cors"
import multer from "multer"
import { resolve } from "path";
import moment from "moment";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";

function fileFilter (req: Request, file: any, cb: Function) {

  // 这个函数应该调用 `cb` 用boolean值来
  // 指示是否应接受该文件

  // 如果file不是image，拒绝这个文件
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only images are allowed!'))
  }

  // 拒绝这个文件，使用`false`，像这样:
  // cb(null, false)

  // 接受这个文件，使用`true`，像这样:
  cb(null, true)

  // 如果有问题，你可以总是这样发送一个错误:
  // cb(new Error('I don\'t have a clue!'))

}
const upload = multer({ fileFilter, limits: { fieldSize: 10485760 } }).single('file')  // 限制文件大小10MB

async function compressImage(fileUrl: string, quality: number[]): Promise<Buffer> {
  // 压缩图片
  const gzFile = await imagemin([fileUrl], {
    plugins: [
      imageminPngquant({
        quality: [quality[0], quality[1]],
      }),
    ],
  });
  return gzFile[0].data;
}

// 创建 express 的服务器实例
const app = express()
// 定义监听端口号
const port = 9093

// write your code here...
app.use(cors({
  origin: '*',
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use('/public', express.static('public'))
app.use(express.json())

// 调用 app.listen 方法，指定端口号并启动Web服务器
app.listen(port, () => {
    // console.log(`Example app listening on port http://127.0.0.1:${port}`)
})

// 项目过于简单，不再使用schema类型检查插件
function checkCompressBody(req: Request, res: Response, next: Function) {
  let quality = req.body.quality

  // 检测file
  if (!req.file) return res.status(422).send('没有上传文件')
  if (!(req.file instanceof Object) || !req.file.originalname || !req.file.size) return res.status(422).send('上传的字段不是一个文件，无效参数：file')

  // 检测quality
  if (quality) {
    // 转换字符串为数字 "[0.3, 0.6]" => 0.3, 0.6
    req.body.quality = quality.substring(1, quality.length - 1).split(',').map((item: string) => parseFloat(item))
    quality = req.body.quality

    if (quality.length !== 2) return res.status(422).send('无效参数：quality')
    
    // 检测各自范围
    if (quality[0] < 0 || quality[0] > 1 || quality[1] < 0 || quality[1] > 1) return res.status(422).send('无效参数：quality.min和quality.max必须在0到1之间')
  }
  else return res.status(422).send('无效参数：quality')

  next()
}

//两数相除取百分比%并保留两位小数
function percentage(number1: number, number2: number) { 
  // 小数点后两位百分比
  return (Math.round(number1/number2 * 10000) / 100.00 + "%");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
      return bytes + ' 字节';
  } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
  } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}

const nodeEnv = process.env.NODE_ENV
const baseUrl = nodeEnv === 'development' ? process.env.BASE_URL : 'https://imagemin.aidesign.org.cn'
console.log("NODE_ENV:", nodeEnv, ' BASE_URL:', baseUrl)
app.post('/compress', upload, checkCompressBody, async (req, res) => {
  const file = req.file
  const fileSuffix = file!.mimetype.split('/')[1]
  const code = Math.floor(Math.random() * 900000) + 100000;
  const filename = `${moment().unix()}_${code}.${fileSuffix}`;
  const filePath = resolve("./", "public", file!.mimetype, filename);
  const gzFilePath = resolve("./", "public", file!.mimetype, `${filename.split('.')[0]}gz.${fileSuffix}`);
  const relativeFilePath = `/public/${file!.mimetype}/${filename}`;
  const gzRelativeFilePath = `/public/${file!.mimetype}/${filename.split('.')[0]}gz.${fileSuffix}`;

  // 将未压缩与压缩文件分别写入
  // 确保目录存在，如果不存在则创建
  await mkdir(filePath.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(filePath, file!.buffer)
  const compressed = await compressImage(filePath, req.body.quality)
  await writeFile(gzFilePath, compressed)

  // 读出两个文件的大小
  const fileSize = Buffer.from(file!.buffer);
  const gzFileSize = Buffer.from(compressed);
  const size = {
    0: formatFileSize(fileSize.length),
    1: formatFileSize(gzFileSize.length),
  }

  const perc = `100% -> ${percentage(gzFileSize.length, fileSize.length)}`
  console.log(`[${gzRelativeFilePath}][${perc}][${size[0]} -> ${size[1]}]`)

  res.send({
    status: 0, 
    messgae: 'success', 
    data: { 
      uncompression: {
        url: baseUrl + relativeFilePath,
        size: size[0]
      }, 
      compressed: {
        url: baseUrl + gzRelativeFilePath,
        size: size[1]
      },
      percentage: perc
    } 
  })
})
