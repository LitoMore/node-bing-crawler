'use strict';

const http = require('http');
const qs = require('querystring');
const async = require('async');
const fs = require('fs');
const UpYun = require('upyun');
const qiniu = require('qiniu');
const MSS = require('mss-sdk');

const {
    LOCAL_PATH,
    MSS_ENABLE,
    MSS_ACCESS_KEY,
    MSS_SECRET_KEY,
    MSS_BUCKET,
    UPYUN_ENABLE,
    UPYUN_BUCKET_NAME,
    UPYUN_OPERATOR_NAME,
    UPYUN_OPERATOR_PWD,
    UPYUN_PATH,
    QINIU_ENABLE,
    QINIU_BUCKET,
    QINIU_ACCESS_KEY,
    QINIU_SECRET_KEY,
    QINIU_PATH,
} = require('./config');


// 无水印壁纸接口
const options_1 = {
    method: 'GET',
    hostname: 'cn.bing.com',
    port: 80,
    path: '/HPImageArchive.aspx?' + qs.stringify({
        format: 'js',
        idx: 0,
        n: 1,
    })
};

// 带壁纸简介的接口
const options_2 = {
    method: 'GET',
    hostname: 'cn.bing.com',
    port: 80,
    path: '/cnhp/coverstory/',
};

const bing_image = {
    url: null,
    filename: null,
    local_path: null,
    upyun_path: null,
    data: null,
};

const mss_config = {
    s3: null,
};

const upyun_config = {
    bucket_name: null,
    operator_name: null,
    operator_pwd: null,
    upyun: null,
};

const qiniu_confg = {
    token: null,
    extra: null,
};

async.parallel({
    // 请求壁纸接口
    img: function (callback) {
        getImg(callback);
    },
    // 请求简介接口
    text: function (callback) {
        getText(callback);
    },
    // 读取配置
    config: function (callback) {
        getConfig(callback);
    }
}, function (request_err, request_result) {
    if (!request_err) {
        bing_image.url = request_result.img.url;
        bing_image.filename = request_result.img.fullstartdate + '.jpg';
        async.parallel({
            // 下载图片
            download: function (callback) {
                downloadImage(callback);
            },
            // 准备本地文件夹
            local_dir: function (callback) {
                initLocalDir(callback);
            },
        }, function (crawler_err, crawler_result) {
            bing_image.data = crawler_result.download;
            if (!crawler_err) {
                async.parallel({
                    // 保存文件到本地
                    save: function (callback) {
                        localSave(callback);
                    },
                    // 准备又拍云
                    upyun_init: function (callback) {
                        if (UPYUN_ENABLE) {
                            upyunInit(callback);
                        } else {
                            console.log('UpYun disabled.');
                            callback(null, null);
                        }
                    },
                    // 准备七牛云
                    qiniu_init: function (callback) {
                        if (QINIU_ENABLE) {
                            qiniuInit(callback);
                        } else {
                            console.log('Qiniu disabled.');
                            callback(null, null);
                        }
                    },
                    // 准备美团云
                    mss_init: function (callback) {
                        if (MSS_ENABLE) {
                            mssInit(callback);
                        } else {
                            console.log('MSS disabled');
                            callback(null, null);
                        }
                    }
                }, function (save_err, save_result) {
                    if (!save_err) {
                        async.parallel({
                            // 保存图片至又拍云
                            upyunPut: function (callback) {
                                if (UPYUN_ENABLE) {
                                    upyun_config.upyun = save_result.upyun_init;
                                    upyunPutFile(callback);
                                } else {
                                    callback(null, null)
                                }
                            },
                            // 保存图片至七牛
                            qiniuPut: function (callback) {
                                if (QINIU_ENABLE) {
                                    qiniu_confg.token = save_result.qiniu_init.token;
                                    qiniu_confg.extra = save_result.qiniu_init.extra;
                                    qiniuPutFile(callback);
                                } else {
                                    callback(null, null);
                                }
                            },
                            // 保存图片至美团云
                            mssPut: function (callback) {
                                if (MSS_ENABLE) {
                                    mss_config.s3 = save_result.mss_init;
                                    mssPutFile(callback);
                                } else {
                                    callback(null, null);
                                }
                            }
                        }, function (save_err, save_result) {
                            if (!save_err) {
                                console.log('Done.')
                            }
                        });
                    }
                });
            }
        });
    }
});

// 获取图片
function getImg(callback) {
    http.request(options_1, function (res) {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            callback(null, JSON.parse(data).images[0]);
        });
    }).on('error', function (e) {
        console.log('Error: ' + e.message);
    }).end();
}

// 获取简介
function getText(callback) {
    http.request(options_2, function (res) {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            callback(null, JSON.parse(data));
        });
    }).on('error', function (e) {
        console.log('Error: ' + e.message);
    }).end();
}

// 获取配置
function getConfig(callback) {
    fs.readFile(__dirname + '/config.json', 'utf-8', function (read_err, read_result) {
        if (!read_err) {
            callback(null, JSON.parse(read_result));
        }
    });
}

// 下载图片
function downloadImage(callback) {
    let download_option = {
        method: 'GET',
        hostname: 'cn.bing.com',
        port: 80,
        path: bing_image.url,
    };
    http.request(download_option, function (res) {
        let data = '';
        res.setEncoding('binary');
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            callback(null, data);
        });
    }).on('error', function (e) {
        console.log('Error: ' + e.message);
    }).end();
}

// 准备本地文件夹
function initLocalDir(callback) {
    fs.exists(__dirname + LOCAL_PATH, function (exist) {
        if (!exist) {
            fs.mkdir(__dirname + LOCAL_PATH, function (mkdir_err, mkdir_result) {
                if (!mkdir_err) {
                    callback(null, mkdir_result);
                }
            });
        } else {
            callback(null, exist);
        }
    });
}

// 保存文件到本地
function localSave(callback) {
    fs.writeFile(
        __dirname + LOCAL_PATH + bing_image.filename,
        bing_image.data,
        'binary',
        function (fs_err) {
            if (!fs_err) {
                console.log('Local saved.')
                callback(null, 'Saved!');
            }
        }
    );
}

// 准备美团云
function mssInit(callback) {
    const s3 = new MSS.S3({
        accessKeyId: MSS_ACCESS_KEY,
        secretAccessKey: MSS_SECRET_KEY,
    });
    callback(null, s3);
}

// 保存文件至美团云
function mssPutFile(callback) {
    const fileBuffer = fs.readFileSync(__dirname + LOCAL_PATH + bing_image.filename);
    mss_config.s3.putObject({
        Bucket: MSS_BUCKET,
        Key: bing_image.filename,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
    }, function (err, ret) {
        if (!err) {
            console.log('Meituan saved.');
            callback(null, ret);
        }
    });
}

// 准备又拍云
function upyunInit(callback) {
    const upyun = new UpYun(
        UPYUN_BUCKET_NAME,
        UPYUN_OPERATOR_NAME,
        UPYUN_OPERATOR_PWD,
        'v0.api.upyun.com', {
            apiVersion: 'v2'
        }
    );
    upyun.headFile(UPYUN_PATH, function (file_err, file_result) {
        if (!file_err) {
            if (file_result.statusCode === 404) {
                upyun.makeDir(UPYUN_PATH, function (make_dir_err, make_dir_result) {
                    if (!make_dir_err) {
                        callback(null, upyun)
                    }
                });
            } else if (file_result.statusCode === 200) {
                callback(null, upyun)
            } else {
                console.log('Unexpected status code ' + file_result.statusCode);
            }
        }
    });
}

// 保存文件至又拍云
function upyunPutFile(callback) {
    upyun_config.upyun.putFile(
        UPYUN_PATH + bing_image.filename,
        __dirname + LOCAL_PATH + bing_image.filename,
        'image/jpeg',
        0,
        null,
        function (put_err, put_result) {
            if (!put_err) {
                console.log('UpYun saved.')
                callback(null, put_result);
            }
        }
    );
}

// 准备七牛云
function qiniuInit(callback) {
    qiniu.conf.ACCESS_KEY = QINIU_ACCESS_KEY;
    qiniu.conf.SECRET_KEY = QINIU_SECRET_KEY;

    const token = new qiniu.rs.PutPolicy(QINIU_BUCKET + ':' + bing_image.filename).token();
    const extra = new qiniu.io.PutExtra();

    callback(null, {
        token: token,
        extra: extra
    });
}

// 保存文件至七牛云
function qiniuPutFile(callback) {
    qiniu.io.putFile(
        qiniu_confg.token,
        bing_image.filename,
        __dirname + LOCAL_PATH + bing_image.filename,
        qiniu_confg.extra,
        function (err, ret) {
            if (!err) {
                console.log('Qiniu saved.');
                callback(null, ret);
            }
        }
    )
}
