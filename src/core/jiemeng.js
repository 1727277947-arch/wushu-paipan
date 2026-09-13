/**
 * 解梦引擎（周公解梦 · 五行象义）。
 * 思路：把梦境文本拆成「象」（关键词），每个象归于五行与吉凶倾向，
 * 再结合做梦时辰与梦境情绪，合成一段白话论断。
 * 全部为纯函数，不依赖 DOM，也不外联任何数据。
 */

import { BRANCH_WUXING, dayPillarIndex, jiaziName, hourBranchIndex, STEMS, BRANCHES } from './lunar.js';

/** 梦中情绪的调节权重 */
export const MOODS = {
  平静: { label: '平静', bias: 0, word: '心境平和，此事多半有回旋余地' },
  喜悦: { label: '喜悦', bias: 1.2, word: '梦里高兴，是心气顺的体现，事多向好' },
  害怕: { label: '害怕', bias: -1.2, word: '梦里害怕，多为心事积压，宜先安神' },
  悲伤: { label: '悲伤', bias: -1.0, word: '梦里难过，是郁气外泄，哭过反倒轻松' },
  愤怒: { label: '愤怒', bias: -0.8, word: '梦里动怒，是肝气偏旺，现实中宜少与人争' },
};

/**
 * 梦象库。keys 为触发关键词（命中其一即算），wuxing 为所属五行，
 * luck 为传统解梦的吉凶倾向，text 为白话断语，advice 为可照做的建议。
 */
export const DREAM_SYMBOLS = [
  { name: '天', keys: ['天', '天空', '天上'], wuxing: '金', luck: 0.6,
    text: '梦见天，老话说「天开有喜」。抬头见天，是心里有盼头，事情有明朗的迹象。',
    advice: '适合把憋着的事摊开来说。' },
  { name: '太阳', keys: ['太阳', '日头', '日出', '阳光'], wuxing: '火', luck: 1.2,
    text: '太阳主阳气、主名声。梦见日出或阳光普照，是走运的兆头，尤其利考试、升迁、露面的事。',
    advice: '有露脸的机会别推，该争取就去争取。' },
  { name: '月亮', keys: ['月亮', '月圆', '月光', '满月'], wuxing: '水', luck: 0.8,
    text: '月主阴、主情感与远方的人。梦见月圆，多指团圆或感情有进展；月缺则提示聚少离多。',
    advice: '给久没联系的人打个电话，会有回音。' },
  { name: '星辰', keys: ['星星', '星辰', '星空', '流星'], wuxing: '火', luck: 0.9,
    text: '星主贵人与机会。梦见满天星，说明身边有贵人，只是你还没认出来。',
    advice: '多留意最近主动帮你的人。' },
  { name: '云', keys: ['乌云', '云彩', '白云'], wuxing: '水', luck: 0,
    text: '云主变动。白云是闲适，乌云则提示近期有变数，但云过天晴，不必过虑。',
    advice: '把事情往坏处想一遍、备好方案，就不慌了。' },
  { name: '雨', keys: ['下雨', '暴雨', '淋雨'], wuxing: '水', luck: 0.5,
    text: '雨主财也主愁。梦见下雨，传统上多解为「财来」，但若淋得狼狈，则是心事压身。',
    advice: '若梦里狼狈，说明最近累，给自己减点担子。' },
  { name: '雪', keys: ['下雪', '大雪', '雪花'], wuxing: '水', luck: 0.7,
    text: '雪主洁净与转机。梦见雪，多指烦事将被洗清，或有一笔意外之财。',
    advice: '该了结的旧账、旧事，趁这段时间收尾。' },
  { name: '雷', keys: ['打雷', '雷声', '惊雷'], wuxing: '木', luck: 0.9,
    text: '雷主声名与震动。梦见打雷，是「不鸣则已，一鸣惊人」的象，多指名声将起。',
    advice: '有好想法别憋着，该说就说。' },
  { name: '风', keys: ['刮风', '大风', '台风'], wuxing: '木', luck: 0.2,
    text: '风主传播也主不定。梦见风，提示消息会传开，或计划有变，宜顺势不宜硬顶。',
    advice: '话别说太满，留个余地。' },
  { name: '彩虹', keys: ['彩虹', '彩霞', '晚霞'], wuxing: '火', luck: 1,
    text: '虹主贵人牵线、喜事将至。梦见彩虹，多指有人从中搭桥，帮你办成难办的事。',
    advice: '多走动、多赴约，机会在饭桌上。' },
  { name: '山', keys: ['爬山', '上山', '高山', '山顶', '山'], wuxing: '土', luck: 0.8,
    text: '山主靠山与阻碍。梦见登山而上，是有靠山、能上位的吉象；困在山中则提示眼前有坎。',
    advice: '往上走要借力，别一个人硬爬。' },
  { name: '水', keys: ['河水', '湖水', '大海', '游泳', '水里', '水'], wuxing: '水', luck: 0.7,
    text: '水主财、主流通。梦见水清而缓，是财路顺；水浊或溺水，则是为钱为情所困。',
    advice: '水清可大胆求财，水浊先理清账目和关系。' },
  { name: '火', keys: ['着火', '火灾', '燃烧', '大火'], wuxing: '火', luck: 0.9,
    text: '火主兴旺。梦见火烧，老话讲「火烧旺地」，多指财运与事业要起势。',
    advice: '势头来了就抓紧，别观望。' },
  { name: '土地', keys: ['土地', '泥土', '挖土'], wuxing: '土', luck: 0.6,
    text: '土主根基与不动产。梦见土地，多与房产、置产、稳当的进项有关。',
    advice: '适合谈房子、谈长线的事。' },
  { name: '路', keys: ['迷路', '走路', '道路上', '小路', '公路'], wuxing: '土', luck: 0.3,
    text: '路主前程。梦见大路平坦，是路子顺；迷路或路断，则提示方向还没定下来。',
    advice: '迷路之梦，多是提醒你把目标想清楚再动。' },
  { name: '桥', keys: ['过桥', '桥梁', '桥上', '桥'], wuxing: '木', luck: 1.1,
    text: '桥主过渡、主贵人。梦见过桥，是「有桥可过」之象，指难关有人帮你跨过去。',
    advice: '该求人的时候别硬撑。' },
  { name: '房子', keys: ['房子', '房屋', '新房', '老屋', '屋顶', '家'], wuxing: '土', luck: 0.8,
    text: '房子主家运与归宿。梦见新居或大宅，多指家运上升或要置产；房破则提示家里有事要照看。',
    advice: '多关心家里老人，家和才聚财。' },
  { name: '门', keys: ['开门', '关门', '大门', '门'], wuxing: '木', luck: 0.7,
    text: '门主机会。梦见开门，是好机会进来了；门关着，提示时机未到，别硬闯。',
    advice: '门开着就进，关着就先做准备。' },
  { name: '窗', keys: ['窗户', '窗外', '窗'], wuxing: '木', luck: 0.5,
    text: '窗主眼界与消息。梦见窗外有景，提示会有新消息进来，眼界要放开。',
    advice: '别闷着，多出门走走。' },
  { name: '父母', keys: ['父亲', '妈妈', '母亲', '爸妈', '父母'], wuxing: '土', luck: 0.6,
    text: '梦见父母，主根基与庇荫。老话讲「日有所思」，也提示家里的事该上心了。',
    advice: '给家里打个电话，或回去吃顿饭。' },
  { name: '故人', keys: ['去世', '死去的', '已故', '爷爷', '奶奶', '外婆', '外公'], wuxing: '土', luck: 0.5,
    text: '梦见已故亲人，传统上叫「亲人托梦」，多主提醒与庇佑，不是凶兆。',
    advice: '按老规矩上炷香、说说话，心里会踏实。' },
  { name: '孩童', keys: ['小孩', '孩子', '婴儿', '宝宝', '男孩', '女孩'], wuxing: '木', luck: 0.9,
    text: '孩童主新生与喜气。梦见小孩，多主添丁、喜事，或一件事有了新开头。',
    advice: '想开新摊子、新项目，现在是个好时候。' },
  { name: '老人', keys: ['老人', '老头', '老太太', '长辈'], wuxing: '土', luck: 0.8,
    text: '老人主智慧与指点。梦见老者，多指有人会给你一句关键的话，要听得进去。',
    advice: '长辈说的话，这次别当耳旁风。' },
  { name: '陌生人', keys: ['陌生人', '不认识的人', '生人'], wuxing: '金', luck: 0.4,
    text: '陌生人主新的人事关系。梦见生人，多指近期会结识新的人，或遇到新机会。',
    advice: '有人搭话别急着拒，先听听。' },
  { name: '争斗', keys: ['敌人', '仇人', '打架', '吵架', '被追', '追赶'], wuxing: '金', luck: -0.8,
    text: '梦见争斗或被追，多是现实里压力没处撒，未必应验在人事上。',
    advice: '近来少与人争，把火气用在做事上。' },
  { name: '官贵', keys: ['当官', '领导', '老板', '官府', '警察', '法官'], wuxing: '金', luck: 0.7,
    text: '官主名位与规矩。梦见官贵，多指有升迁、被提拔的迹象，或要办事走流程。',
    advice: '该走的程序走全，别图省事。' },
  { name: '神佛', keys: ['和尚', '僧人', '道士', '神仙', '菩萨', '佛祖', '庙'], wuxing: '金', luck: 1,
    text: '梦见神佛僧道，主善缘与提醒。传统上解为「有贵人暗中相助」，也是自身心向善的体现。',
    advice: '这段时间多做善事，福报来得快。' },
  { name: '龙', keys: ['巨龙', '龙飞', '龙'], wuxing: '土', luck: 1.5,
    text: '龙主大贵。梦见龙，是传统解梦里数一数二的大吉之象，主地位、名声有大提升。',
    advice: '胆大一点，该争的位置就争。' },
  { name: '蛇', keys: ['被蛇', '蟒蛇', '蛇'], wuxing: '火', luck: 0.3,
    text: '蛇在传统解梦里是「小龙」，主财也主暗事。梦见蛇入怀多为得财，被蛇咬则提示身边有小人。',
    advice: '财上的事留个字据，防人一手。' },
  { name: '虎', keys: ['老虎', '猛虎', '虎'], wuxing: '木', luck: 1,
    text: '虎主威权与胆气。梦见虎，多指将担当重任、须独当一面；被虎追则是压力之象。',
    advice: '该挑担子的时候别躲。' },
  { name: '马', keys: ['骑马', '奔马', '马'], wuxing: '火', luck: 1.1,
    text: '马主奔波与升迁。梦见骑马奔驰，主事业有进展、动中得利。',
    advice: '该跑的动起来，坐着等不来机会。' },
  { name: '牛', keys: ['耕牛', '水牛', '牛'], wuxing: '土', luck: 0.9,
    text: '牛主勤劳与积累。梦见牛，是「一分耕耘一分收获」的象，踏实做事必有回报。',
    advice: '别想捷径，把手里的事做扎实。' },
  { name: '鱼', keys: ['抓鱼', '钓鱼', '鲤鱼', '鱼'], wuxing: '水', luck: 1.2,
    text: '鱼谐音「余」，主盈余、主财。梦见鱼，是最经典的进财之象，鱼越大财越大。',
    advice: '理财可以更积极些，机会就在眼前。' },
  { name: '飞鸟', keys: ['小鸟', '飞鸟', '喜鹊', '燕子', '鸟'], wuxing: '火', luck: 1,
    text: '鸟主消息与升迁。梦见飞鸟或喜鹊，多指有好消息到，或职位有变动。',
    advice: '留意手机和邮箱，好消息在路上。' },
  { name: '狗', keys: ['小狗', '被狗', '狗咬', '狗'], wuxing: '土', luck: 0.5,
    text: '狗主朋友与忠信。梦见亲人的狗主友情相助；被狗咬则提示朋友之间可能有口角。',
    advice: '朋友的事帮，但账要分清。' },
  { name: '猫', keys: ['小猫', '黑猫', '猫'], wuxing: '木', luck: 0.1,
    text: '猫主机敏也主隐情。梦见猫，多指身边有说不清的事，或自己心里有顾虑。',
    advice: '有疑虑就当面问清，别自己在心里盘。' },
  { name: '鼠', keys: ['老鼠', '鼠'], wuxing: '水', luck: -0.5,
    text: '鼠主小耗与隐忧。梦见老鼠，多指有小破财或身边有人打小算盘。',
    advice: '看好钱包，别随意外借。' },
  { name: '龟', keys: ['乌龟', '海龟', '龟'], wuxing: '水', luck: 1,
    text: '龟主长寿与稳当。梦见龟，主身体康健、家宅安稳，也主慢而必得的事。',
    advice: '慢慢来的事，别急着催。' },
  { name: '凤凰', keys: ['凤凰', '孔雀'], wuxing: '火', luck: 1.4,
    text: '凤凰主荣华。梦见凤凰，是「锦上添花」之象，主喜事与名声双至。',
    advice: '好事将近，把场面备好。' },
  { name: '牙齿', keys: ['掉牙', '牙齿', '牙'], wuxing: '金', luck: -0.4,
    text: '牙主骨肉至亲。老话「齿落更生」，梦见掉牙多是提示要多关心家中长辈的身体。',
    advice: '带家里老人做次体检，比什么都实在。' },
  { name: '头发', keys: ['头发', '剪发', '掉头发', '理发'], wuxing: '木', luck: 0.4,
    text: '发主气血与体面。梦见剪发多是「去旧迎新」，掉发则提示近来劳累、要养身体。',
    advice: '该放的事放一放，气顺了事才顺。' },
  { name: '血', keys: ['流血', '出血', '血'], wuxing: '火', luck: 0.9,
    text: '血主财也主亲。传统解梦里见血多为得财之象，所谓「血财」，不必害怕。',
    advice: '近期有进项的迹象，守好自己的份。' },
  { name: '衣服', keys: ['衣服', '新衣', '穿衣', '裤子'], wuxing: '木', luck: 0.8,
    text: '衣主身份与体面。梦见穿新衣，多主体面事、有喜事，或身份有提升。',
    advice: '该置办的行头置办上，人靠衣装。' },
  { name: '金银', keys: ['捡钱', '收钱', '钞票', '黄金', '银子', '金子', '钱'], wuxing: '金', luck: 0.6,
    text: '梦里的钱未必应验在钱上，但主「有所得」。梦见得财，多指努力将见回报。',
    advice: '踏实的付出已经在攒着了，别急。' },
  { name: '棺材', keys: ['棺材', '出殡', '葬礼', '坟'], wuxing: '土', luck: 1.3,
    text: '棺材谐音「官财」，是传统解梦里的大吉之象，主升官与进财，梦见反是喜事。',
    advice: '这是好兆头，该图的事大胆去图。' },
  { name: '船', keys: ['坐船', '划船', '船'], wuxing: '水', luck: 0.8,
    text: '船主渡与远行。梦见行船顺水，主事情顺利、有远方的机会；船破则提示计划欠稳。',
    advice: '有外地的机会可以接着，多走动有好处。' },
  { name: '车', keys: ['开车', '坐车', '汽车', '车'], wuxing: '金', luck: 0.5,
    text: '车主行程与效率。梦见开车顺畅，主事有进展；车坏、失控则提示节奏太赶、要减速。',
    advice: '别把日程排太满，留出转圜的余地。' },
  { name: '刀剑', keys: ['刀具', '被砍', '刀', '剑'], wuxing: '金', luck: 0.3,
    text: '刀剑主决断。梦见用刀，是把事情一刀两断的象；被砍则提示有冲突要化解。',
    advice: '该断的关系、该辞的事，果断些反而轻松。' },
  { name: '镜子', keys: ['照镜子', '镜子'], wuxing: '金', luck: 0.5,
    text: '镜主自省。梦见照镜，多是近期在反思自己，或有件事需要你回头看一遍。',
    advice: '回头看一遍，往往能发现问题在哪。' },
  { name: '读书', keys: ['读书', '写字', '考试', '上学', '课堂', '老师', '同学', '书'], wuxing: '木', luck: 1,
    text: '书主学问与功名。梦见读书考试，主学业、证书、资质上有好消息，利考试升迁。',
    advice: '该考的证、该报的名，别拖。' },
  { name: '花', keys: ['开花', '鲜花', '桃花', '花'], wuxing: '木', luck: 1.1,
    text: '花主喜庆与姻缘。梦见花开，主喜事、感情顺遂；花谢则提示好时节要抓紧。',
    advice: '单身的别闷在家里，多赴约。' },
  { name: '树', keys: ['大树', '栽树', '树林', '树'], wuxing: '木', luck: 0.8,
    text: '树主根基与长久。梦见枝繁叶茂，主家业兴旺、身体康健；枯树则提示要培本固元。',
    advice: '长线的事值得投，别只顾眼前。' },
  { name: '果实', keys: ['摘果', '果子', '果实', '粮食', '稻谷', '麦子', '丰收'], wuxing: '木', luck: 1.2,
    text: '果主收成。梦见果实累累、谷物满仓，是「耕耘见收」之象，主财与事业双得。',
    advice: '前期的努力要见结果了，稳住别松劲。' },
  { name: '绳索', keys: ['被绑', '捆绑', '绳子', '锁'], wuxing: '火', luck: -0.7,
    text: '绳主束缚。梦见被绑被锁，多指被某件事、某段关系困住了，脱身需要方法。',
    advice: '先找出捆住你的那件事，解决它比硬挣有用。' },
  { name: '井', keys: ['水井', '打水', '井'], wuxing: '水', luck: 0.9,
    text: '井主根源与源源不断。梦见井水清甜，主财源长远、家道有根。',
    advice: '把根基的事打理好，比追一时快钱强。' },
  { name: '飞行', keys: ['飞翔', '腾空', '飘起来', '会飞', '飞'], wuxing: '火', luck: 1,
    text: '飞主跃升。梦见自己能飞，是心气高、志气足之象，主地位或眼界要上一个台阶。',
    advice: '把目标定高一点，你撑得住。' },
  { name: '坠落', keys: ['掉下去', '坠落', '踩空', '跌倒', '摔'], wuxing: '水', luck: -0.9,
    text: '坠落主失据。梦见往下掉，多指心里没底或担心失去什么，并非真有什么灾。',
    advice: '把担心的事写下来，逐条想办法，心就定了。' },
  { name: '逃亡', keys: ['逃跑', '躲藏', '逃'], wuxing: '木', luck: -0.6,
    text: '被追赶主逃避。梦见被人追着跑，多是现实里有件事你一直在躲。',
    advice: '躲得越久越累，挑一件先面对掉。' },
  { name: '哭泣', keys: ['大哭', '流泪', '哭'], wuxing: '水', luck: 0.3,
    text: '梦哭主宣泄。老话讲「梦哭得财」，哭出来是心里郁气散了，醒来反倒轻松。',
    advice: '情绪别硬憋，找个出口比什么都强。' },
  { name: '欢笑', keys: ['大笑', '开心', '笑'], wuxing: '火', luck: 0.8,
    text: '笑主心气顺。梦见开怀大笑，主近期人缘好、事情顺，心宽则运宽。',
    advice: '把这份好心态留住，事情会越走越顺。' },
  { name: '婚嫁', keys: ['结婚', '婚礼', '出嫁', '娶'], wuxing: '火', luck: 0.9,
    text: '婚主结合与成事。梦见婚嫁，除应验姻缘外，也常主一件事「成了」、一桩合作谈成。',
    advice: '感情与合作的事，近期都适合往前推一步。' },
  { name: '生育', keys: ['怀孕', '生子', '生孩子', '生产'], wuxing: '木', luck: 1.1,
    text: '孕主新机。梦见怀孕生子，主一件事有了眉目、新计划要落地，也主添丁之喜。',
    advice: '酝酿已久的想法，可以开始动手了。' },
  { name: '死亡', keys: ['死人', '尸体', '死了'], wuxing: '土', luck: 0.7,
    text: '梦见死，传统解梦里主「生」，是旧事了结、新局将开之象，不必害怕。',
    advice: '该了结的旧事，趁这段时间收尾。' },
  { name: '沐浴', keys: ['洗澡', '洗衣', '沐浴'], wuxing: '水', luck: 0.8,
    text: '洗主去旧。梦见沐浴更衣，主洗去晦气、烦恼将消，是转运的前兆。',
    advice: '把该清的清掉——账、人、物都一样。' },
  { name: '病痛', keys: ['生病', '住院', '打针', '吃药'], wuxing: '金', luck: -0.3,
    text: '梦见生病，未必是身子有恙，多是身体在提醒你累了，该歇一歇。',
    advice: '把睡眠补回来，比吃什么补品都强。' },
  { name: '迷途', keys: ['找不到', '走不出去', '迷宫'], wuxing: '土', luck: -0.5,
    text: '迷路主方向未定。梦见找不着路、走不出去，多指选择太多、心里没主意。',
    advice: '把选项砍到两个，就容易决定了。' },
  { name: '失盗', keys: ['小偷', '偷东西', '抓贼', '被盗'], wuxing: '金', luck: -0.4,
    text: '失盗主损耗。梦见被偷，多指有该留心的地方，比如账目、承诺、身体的亏空。',
    advice: '回头把开支和约定过一遍，漏洞多半在那。' },
  { name: '溺水', keys: ['掉水里', '溺水', '淹'], wuxing: '水', luck: -0.8,
    text: '梦见溺水，多指被情绪或钱事淹得喘不上气，是心累的写照。',
    advice: '找人说说，别一个人扛。' },
];

/** 五行 -> 通俗对应，用于建议段 */
const WX_ADVICE = {
  木: '木主生发，向东方、青色，做成长型的事',
  火: '火主明亮，向南方、红色，做需要露脸的事',
  土: '土主稳固，向中央、黄色，做扎实长久的事',
  金: '金主决断，向西方、白色，做需要拿主意的事',
  水: '水主流通，向北方、黑色，做需要周旋走动的事',
};

/** 把梦境文本拆成命中的梦象（长词优先，避免「山」抢了「高山」） */
export function matchSymbols(dreamText) {
  const text = String(dreamText || '');
  const taken = new Array(text.length).fill(false);

  const pool = [];
  DREAM_SYMBOLS.forEach((sym) => {
    sym.keys.forEach((k) => pool.push({ k, sym }));
  });
  pool.sort((a, b) => b.k.length - a.k.length);

  const hits = [];
  pool.forEach(({ k, sym }) => {
    let from = 0;
    for (;;) {
      const idx = text.indexOf(k, from);
      if (idx === -1) break;
      let free = true;
      for (let i = idx; i < idx + k.length; i += 1) if (taken[i]) { free = false; break; }
      if (free) {
        for (let i = idx; i < idx + k.length; i += 1) taken[i] = true;
        if (!hits.some((h) => h.sym.name === sym.name)) hits.push({ sym, keyword: k, index: idx });
      }
      from = idx + 1;
    }
  });

  return hits.sort((a, b) => a.index - b.index);
}

/** 由梦象统计五行分布 */
export function wuxingTally(hits) {
  const tally = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  hits.forEach((h) => { tally[h.sym.wuxing] += 1; });
  const total = hits.length || 1;
  const percent = Object.fromEntries(
    Object.entries(tally).map(([k, v]) => [k, (v / total) * 100]),
  );
  const dominant = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  return { tally, percent, dominant, total: hits.length };
}

/** 由做梦时刻取日柱与时柱（用于「梦应何时」） */
function dreamTimeInfo(dt) {
  const dpIdx = dayPillarIndex(dt.year, dt.month, dt.day);
  const dayGanZhi = jiaziName(dpIdx);
  const hIdx = hourBranchIndex(dt.hour);
  const hourBranch = BRANCHES[hIdx];
  const stemIdx = ((dpIdx % 10) * 2 + hIdx) % 10;
  const hourGanZhi = STEMS[stemIdx] + hourBranch;
  return { dayGanZhi, hourGanZhi, hourBranch, hourElement: BRANCH_WUXING[hourBranch] };
}

/** 时辰 -> 传统「梦应」说法 */
const HOUR_OMEN = {
  子: '子时（23-1点）做的梦，主远事，多应在一个月以后',
  丑: '丑时（1-3点）做的梦，主家宅事，多应在田宅与家人身上',
  寅: '寅时（3-5点）做的梦，主新起之事，多在开春或新的开端上应验',
  卯: '卯时（5-7点）做的梦，主门户事，多应出门、走动、人事变动',
  辰: '辰时（7-9点）做的梦，主争讼事，多应在文书、合同、口舌上',
  巳: '巳时（9-11点）做的梦，主财帛事，多应在进项与银钱上',
  午: '午时（11-13点）做的梦，主喜信事，多应在消息与聚会、宴席上',
  未: '未时（13-15点）做的梦，主酒食事，多应在吃喝往来与人情上',
  申: '申时（15-17点）做的梦，主远行事，多应在出行、外派、搬迁上',
  酉: '酉时（17-19点）做的梦，主阴私事，多应在暗中的事与旧账上',
  戌: '戌时（19-21点）做的梦，主官讼事，多应在规矩、上峰、纠纷上',
  亥: '亥时（21-23点）做的梦，主寿考事，多应在身体与长辈身上',
};

/** 五行 -> 宜避之处，用于收尾叮嘱 */
const WX_AVOID = {
  木: '忌一味贪快、忌把摊子铺得太大',
  火: '忌急躁上火、忌逞口舌之快',
  土: '忌原地不动、忌把事压在自己一个人身上',
  金: '忌硬碰硬、忌把话说绝',
  水: '忌随波逐流、忌拿不定主意来回变',
};
/** 吉凶分档 */
function levelOf(score) {
  if (score >= 1.5) return { level: '大吉', cls: 'lv-great' };
  if (score >= 0.6) return { level: '吉', cls: 'lv-good' };
  if (score > -0.6) return { level: '平', cls: 'lv-flat' };
  if (score > -1.5) return { level: '不佳', cls: 'lv-bad' };
  return { level: '凶', cls: 'lv-worst' };
}

/** 五行 -> 该行当主什么事 */
const WX_THEME = {
  木: '起步与成长',
  火: '名声与功劳',
  土: '家宅与根基',
  金: '名分与纠纷',
  水: '走动与进项',
};

/** 五行 -> 该行的性质 */
const WX_NATURE = {
  木: '生长、起步',
  火: '明亮、显达',
  土: '稳固、家宅',
  金: '规矩、决断',
  水: '流通、变动',
};

/**
 * 主入口：解一个梦。
 * @param {string} dreamText 梦境描述
 * @param {object} dt 做梦时刻 { year, month, day, hour, minute }
 * @param {object} opts { mood }
 */
export function interpretDream(dreamText, dt, opts = {}) {
  const hits = matchSymbols(dreamText);
  const wx = wuxingTally(hits);
  const time = dreamTimeInfo(dt);
  const moodKey = opts.mood && MOODS[opts.mood] ? opts.mood : '平静';
  const mood = MOODS[moodKey];

  // ── 吉凶合成 ──
  // 梦象的吉凶倾向取平均（避免梦象多就分数虚高），再叠加情绪影响
  const rawLuck = hits.length
    ? hits.reduce((a, h) => a + h.sym.luck, 0) / hits.length
    : 0;
  const score = rawLuck + mood.bias * 0.35;
  const { level, cls } = levelOf(score);

  const paras = [];

  // ── 一、总断 ──
  paras.push({
    title: '一、这个梦，先给你一个总的说法',
    text: (hits.length
      ? '你这个梦里，我挑出了 ' + hits.length + ' 样要紧的东西：'
        + hits.map((h) => h.sym.name).join('、') + '。'
        + '老话讲「梦是心头想」，但传统解梦更看重梦里出现的「象」——象出来了，意思就出来了。'
      : '你这个梦，我没能从里面认出确切的「象」。这不要紧——梦本来就不必句句有解。'
        + '下面的话你当个提醒听就行。')
      + '整体给个说法：这一梦属【' + level + '】。'
      + (level === '大吉' ? '是好梦，梦里是顺的，现实中也不妨放开手去做。'
        : level === '吉' ? '偏吉，事情有往好里走的迹象，抓住近期这股劲。'
        : level === '平' ? '不好不坏，属于提醒你留神，不必挂心。'
        : level === '不佳' ? '偏忧，但梦里的忧多是提醒，不是定数，提前避一避就好。'
        : '这个梦让你不舒服，但请记住：噩梦在传统解梦里多半是「反梦」，是心在替你排解压力。')
      + '你是在' + time.hourBranch + '时做的这个梦，' + (HOUR_OMEN[time.hourBranch] || '') + '。'
  });

  // ── 二、逐象拆解 ──
  if (hits.length) {
    paras.push({
      title: '二、一样一样给你拆开说',
      text: hits.map((h) => '【' + h.sym.name + '】' + h.sym.text).join(''),
    });
  }

  // ── 三、梦的气象 ──
  const wxParts = Object.entries(wx.percent)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => k + '占 ' + v.toFixed(0) + '%');
  const themeText = (hits.length
    ? '把梦里的东西按五行归归类：' + (wxParts.join('，') || '无') + '。'
      + '其中' + wx.dominant + '最重，这场梦的气就落在' + wx.dominant + '上。'
      + '翻译过来就是：' + WX_ADVICE[wx.dominant] + '。'
    : '梦象太少，五行归不了类，这一节就略过。')
    + '再补一句时辰上的说法：你做梦的日子是' + time.dayGanZhi + '日、' + time.hourGanZhi + '时。'
    + '梦落在' + time.hourElement + '上，' + time.hourElement + '主' + WX_NATURE[time.hourElement] + '，'
    + '所以这个梦多半和' + WX_THEME[time.hourElement] + '有些关系。';
  paras.push({ title: '三、这场梦的气象', text: themeText });

  // ── 四、该怎么做 ──
  const advices = hits.map((h) => h.sym.advice).filter(Boolean);
  paras.push({
    title: '四、照着做，比瞎琢磨强',
    text: (advices.length
      ? '解梦不是为了吓自己，是为了提个醒。这几条你照着做：'
        + advices.slice(0, 5).map((a, i) => (i + 1) + '、' + a).join('')
      : '这个梦没有给到具体提醒。那就记住一句通用的：近来把心放宽、把事做稳。')
      + '另外，' + mood.word + '。'
      + '最后叮嘱一句：' + WX_AVOID[wx.dominant] + '。',
  });

  return {
    dreamText: String(dreamText || ''),
    solarText: dt.year + '年' + dt.month + '月' + dt.day + '日 '
      + String(dt.hour).padStart(2, '0') + ':' + String(dt.minute || 0).padStart(2, '0'),
    dayGanZhi: time.dayGanZhi,
    hourGanZhi: time.hourGanZhi,
    hourBranch: time.hourBranch,
    hourOmen: HOUR_OMEN[time.hourBranch] || '',
    mood: moodKey,
    hits,
    wuxing: wx,
    score,
    level,
    levelClass: cls,
    narrative: paras,
  };
}

/** 可供界面直接选用的梦象清单 */
export function symbolCatalog() {
  return DREAM_SYMBOLS.map((s) => ({ name: s.name, keys: s.keys, wuxing: s.wuxing, luck: s.luck }));
}

/** 常用梦例，供「随机示例」按钮使用 */
export const DREAM_SAMPLES = [
  '梦见自己在河边钓鱼，钓上来一条很大的鱼，旁边还有喜鹊在叫。',
  '梦见掉牙齿，一颗一颗掉下来，心里很慌，想喊喊不出来。',
  '梦见爬上很高的山顶，看见太阳升起来，山下一片云海。',
  '梦见坐船过河，船在水上走得很稳，对岸有人在等我。',
  '梦见家里进了蛇，绕着房梁，我很害怕地躲开了。',
  '梦见自己会飞，飞过一片树林，最后落在老家的屋顶上。',
  '梦见考试，卷子上的字一个都看不清，交卷铃已经响了。',
  '梦见下了很大的雪，雪停以后地上很干净，有人送我一篮果子。',
];

