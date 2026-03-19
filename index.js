// 企业微信收集表自动创建 - Vercel版
const axios = require('axios');
const crypto = require('crypto');

// ==================== 配置区域 START ====================
const CORP_ID = 'wwf13f93d7d6f34e4e'; // 你的企业ID
const APP_SECRET = 'xAuCndcmTeex9Ro7wFRrX8hxX8okTAvR8_HVgauetaI'; // 你的Secret
const APP_AGENTID = '1000004'; // 你的AgentId
const TOKEN = 'WexinToken2024'; // 你的Token
const ENCODING_AESKEY = 'uXDMyUUMB4uCov2AeTQT9Scga9HTdjJtCXwBRrf3XKN'; // 你的EncodingAESKey
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

// 2. 解密消息体
function decryptMsg(msgSignature, timestamp, nonce, encryptedMsg) {
  const signature = crypto.createHash('sha1')
    .sort([TOKEN, timestamp, nonce, encryptedMsg].join(''))
    .digest('hex');
  if (signature !== msgSignature) {
    throw new Error('签名验证失败');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCODING_AESKEY + '=', 'base64'),
    Buffer.from(CORP_ID, 'base64')
  );
  let decrypted = decipher.update(encryptedMsg, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 3. 创建收集表
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

// 4. 回复用户
async function sendReply(userId, content, token) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;
  await axios.post(url, { touser: userId, msgtype: "text", agentid: APP_AGENTID, text: { content } });
}

// 5. 发送到群
async function sendToChat(chatId, content, token) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/appchat/send?access_token=${token}`;
  await axios.post(url, { chatid: chatId, msgtype: "text", text: { content } });
}

// 6. 主函数
exports.handler = async (req, res) => {
  console.log('收到请求:', req.method, req.query);
  
  // 企业微信GET请求 - 验证URL
  if (req.method === 'GET') {
    const { msg_signature, timestamp, nonce, echostr } = req.query;
    try {
      const decrypted = decryptMsg(msg_signature, timestamp, nonce, echostr);
      res.send(decrypted);
    } catch (e) {
      console.error('验证失败:', e);
      res.status(403).send('验证失败');
    }
    return;
  }
  
  // POST请求 - 处理消息
  try {
    const { msg_signature, timestamp, nonce } = req.query;
    const body = req.body || {};
    const encryptedMsg = body.encrypt || '';
    
    const msg = decryptMsg(msg_signature, timestamp, nonce, encryptedMsg);
    console.log('解密后的消息:', JSON.stringify(msg));
    
    if (msg.msgtype === 'text') {
      const userId = msg.from_user_name;
      const content = msg.content.trim();
      const chatId = msg.chat_info?.chatid || '';
      
      const token = await getAccessToken();
      
      if (content === '创建收集表' || content === '/create') {
        let chatName = '项目';
        if (chatId) {
          try {
            const chatInfo = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/appchat/get?access_token=${token}&chatid=${chatId}`);
            chatName = chatInfo.data.chat_info?.name || '项目';
          } catch (e) { console.error('获取群名失败', e); }
        }
        
        const formId = await createCollectForm(chatName, token);
        const formUrl = `https://work.weixin.qq.com/wework_admin/collect/form?id=${formId}`;
        const reply = `✅ 收集表已创建！\n\n标题：【${chatName}】项目执行调查表\n\n填写链接：${formUrl}`;
        
        await sendReply(userId, reply, token);
        if (chatId) await sendToChat(chatId, reply, token);
        
      } else if (content === '帮助' || content === '/help') {
        await sendReply(userId, "📋 发送「创建收集表」创建调查表\n发送「帮助」显示此信息", token);
      }
    }
    
    res.send('success');
  } catch (error) {
    console.error('处理消息失败:', error);
    res.status(500).send('error');
  }
};
