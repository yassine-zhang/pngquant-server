![preview](/src/image/apifox-request.jpg)

## 请求案例
### JS + Axios
```js
var axios = require('axios');
var FormData = require('form-data');
var fs = require('fs');
var data = new FormData();
data.append('file', fs.createReadStream('/Users/mac/Downloads/爱设计AIGC-邀请海报.png'));
data.append('quality', '[0.3, 0.6]');

var config = {
   method: 'post',
   url: 'http://192.168.1.16:9093/compress',
   headers: { 
      'User-Agent': 'Apifox/1.0.0 (https://apifox.com)', 
      'Accept': '*/*', 
      'Host': '192.168.1.16:9093', 
      'Connection': 'keep-alive', 
      'Content-Type': 'multipart/form-data; boundary=--------------------------104553717485290703562672', 
      ...data.getHeaders()
   },
   data : data
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

```

更多请求案例：[Click to open the apifox external link](https://app.apifox.com/link/project/3207434/history/http-10641)