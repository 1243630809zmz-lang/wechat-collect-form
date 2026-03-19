// 企业微信收集表自动创建 - Vercel版
const axios = require('axios');

// ==================== 配置区域 START ====================
const CORP_ID = 'wwf13f93d7d6f34e4e';
const APP_SECRET = 'xAuCndcmTeex9Ro7wFRrX8hxX8okTAvR8_HVgauetaI';
const APP_AGENTID = '1000004';
const TOKEN = 'WexinToken2024';
// ==================== 配置区域 END ====================

// 全局Token缓存
let accessTokenCache = { token: '', expireTime: 0 };

// 1. 获取AccessToken
async function getAccessToken() {
  const now = Date.now();
  if (accessTokenCache.token && now < accessTokenCache.expireTime) {
    return accessTokenCache.token;
  }
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${APP_SECRET}`;
  const response = await axios.get(url);
  if (response.data.errcode === 0) {
    accessTokenCache.token = response.data.access_token;
    accessTokenCache.expireTime = now + (response.data.expires_in - 60) * 1000;
    return accessTokenCache.token;
  }
  throw new Error(`获取Token失败: ${JSON.stringify(response.data)}`);
}

// 2. 创建收集表
async function createCollectForm(chatName, token) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/wedoc/create_form?access_token=${token}`;
  const body = {
    form_info: {
      form_title: `【${chatName}】项目执行调查表`,
      form_desc: "请填写以下项目执行信息",
      form_question: {
        items: [
          { question_id: 1, title: "项目名称", pos: 1, status: 1, reply_type: 1, must_reply: true, placeholder: "请输入项目名称" },
          { question_id: 2, title: "项目进度", pos: 2, status: 1, reply_type: 2, must_reply: true, option_item: [{ key: 1, value: "未开始", status: 1 }, { key: 2, value: "进行中", status: 1 }, { key: 3, value: "已完成", status: 1 }] },
          { question_id: 3, title: "当前问题", pos: 3, status: 1, reply_type: 1, must_reply: false, placeholder: "请描述遇到的问题" }
        ]
      },
      form_setting: { fill_out_auth: 0, allow_multi_fill: false, can_anonymous: false }
    }
  };
  const response = await axios.post(url, body);
  if (response.data.errcode === 0) return response.data.formid;
  throw new Error(`创建失败: ${JSON.stringify(response.data)}`);
}

// 3. 主函数 - Vercel 格式
module.exports = async (req, res) => {
  console.log('收到请求:', req.method, req.url, req.query);
  
  // 健康检查
  if (req.url === '/' || req.url === '/api') {
    return res.json({ 
      status: 'ok', 
      message: '企业微信收集表机器人已部署',
      version: '1.0.0'
    });
  }
  
  // 创建收集表
  if (req.method === 'GET' && req.query.name) {
    try {
      const chatName = req.query.name || '手动创建';
      const token = await getAccessToken();
      const formId = await createCollectForm(chatName, token);
      const formUrl = `https://work.weixin.qq.com/wework_admin/collect/form?id=${formId}`;
      
      return res.json({
        success: true,
        title: `【${chatName}】项目执行调查表`,
        url: formUrl
      });
    } catch (error) {
      console.error('创建失败:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  
  // 企业微信回调验证
  if (req.method === 'GET') {
    const { echostr } = req.query;
    if (echostr) {
      return res.send(echostr);
    }
    return res.json({ status: 'ok' });
  }
  
  // 其他请求
  return res.json({ status: 'ok', message: '请求已接收' });
};
