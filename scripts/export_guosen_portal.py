# -*- coding: utf-8 -*-
"""Export Guosen portfolio data to static JSON for the portal draft."""

from __future__ import annotations

import json
import math
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

OUT_DIR = ROOT / "public" / "data" / "portal"


def log(message: str) -> None:
    print(message, flush=True)

STRATEGIES = [
    {
        "id": "earnings-surprise",
        "dbName": "超预期精选",
        "displayName": "超预期精选组合",
        "type": "主动量化组合",
        "benchmarkCode": "000905.SH",
        "benchmarkName": "中证500",
        "reportName": "超预期投资全攻略",
        "reportUrl": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247484996&idx=1&sn=ae1c06331af0e489cf304f74ab51d109&chksm=ec6f4426db18cd30cb3286a94dc8615c25f8a9c793edd6dac776264e774d7f9da2ca5956453e&scene=21#wechat_redirect",
        "description": "基于超预期事件股票池，结合基本面与技术面筛选构建组合。",
    },
    {
        "id": "gold-stock-enhanced",
        "dbName": "券商金股增强",
        "displayName": "券商金股增强组合",
        "type": "主动量化组合",
        "benchmarkCode": "h00922.CSI",
        "benchmarkName": "偏股基金指数",
        "reportName": "券商金股全解析—数据、建模与实践",
        "reportUrl": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247504336&idx=1&sn=936266d778a201a485a54b264b219084&chksm=ec6c93b2db1b1aa4efb4b5ce7e95fc0624c21eeadac2ec02a8c3fb65f75dde7a7d24464df63c&scene=21#wechat_redirect",
        "description": "以券商金股股票池为基础，通过组合优化控制个股与风格偏离。",
    },
]

REPORTS = [
    {
        "category": "主动量化选股策略",
        "title": "超预期投资全攻略",
        "url": STRATEGIES[0]["reportUrl"],
    },
    {
        "category": "主动量化选股策略",
        "title": "券商金股全解析—数据、建模与实践",
        "url": STRATEGIES[1]["reportUrl"],
    },
    {
        "category": "主动量化选股策略",
        "title": "稳健型选股策略探析",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247524366&idx=1&sn=d47aee09d198d8a71589619cf75cd4ec&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "启发式分域视角下的多策略增强组合",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247526451&idx=1&sn=691183d584aea21892eb1de17bca1b20&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "财务报表中的Alpha因子扩容与增强",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528396&idx=1&sn=d5eccdd35969cccfd026aa0c7519eaff&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "风险模型全攻略——恪守、衍进与实践",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528094&idx=1&sn=2e64780b46ae50d9a557310a00bd1e85&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "基于风险预算的中证500指数增强策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247500752&idx=1&sn=1ea9137db47f7255eea5d39be4ed4f42&chksm=ec6c81b2db1b08a456be7783b0b94faed56b8656779436895e6c29dd3f22c1f384c53a1a92bf&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "由创新高个股看市场投资热点",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528907&idx=1&sn=21b403775136ff209fc1a5b7a13228fa&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "百亿私募持仓变化透视分析",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528809&idx=1&sn=b26ebbc9b78a803d48810a184ee63c1f&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "隐性风险视角下的选基因子统一改进框架",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247527311&idx=1&sn=d2e66531bcc233bc899b41c9a7e0eff9&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理逆向投资能力与投资业绩",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247527104&idx=1&sn=21b16caee3dac1e57c3eb2e25708a28a&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "公募基金2025年二季报全扫描",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247527871&idx=1&sn=5ff5d690b6c175007cc2b8cfbcca3a5d&scene=21#wechat_redirect",
    },
    {
        "category": "行业轮动系列",
        "title": "寻找关键时刻的领头羊—时点动量全解析",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247514899&idx=1&sn=0c79266853f21ba57b365392034742d3&chksm=ec6cf971db1b70675e59394044034c4b74453c02e0a954418cad9aef5412c90c3c18b409011d&scene=21#wechat_redirect",
    },
    {
        "category": "CTA研究系列",
        "title": "基于连续信号的商品期货交易策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247515758&idx=1&sn=c1f9ce08c9c77bc4bd858c6ac49bb550&chksm=ec6cfc0cdb1b751ae0614de664fb1ad3c97b100e7b69a3c5828640aae957c9eddfd82f4adfc5&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "红利投资全攻略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247521849&idx=1&sn=54c0eab0e310816736aad806c9f591a3&chksm=ec6cd45bdb1b5d4dd7c7dcfd49c0ac8febdae6dafd36cc0da8b7c23258cbb06ea6134e086ef9&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "超额图谱视角下的成长股投资策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247515413&idx=1&sn=0b0006c1309548ba5eb5d1a1ff7fb4b3&chksm=ec6cff77db1b766144d3b1b5f5c98de4266aef841e0d039641c3795159fb09a43b4fe6e7d542&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "战胜机构投资者—再论主动股基业绩增强策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247511461&idx=1&sn=d05f2a77e7bb226793278222f96b8343&chksm=ec6cefc7db1b66d17eef67ebda5793be4e5abbc7709a26604e10ebb5cd2b707b4c31984f3008&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "聚焦小盘股—如何构建小市值股票投资策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247505352&idx=1&sn=e93a2d54092eb235591673464d0aa59f&chksm=ec6c97aadb1b1ebcf0917355232241f4d76f7d29b26838a24016554bc1f9e7d0c0fcec56daec&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "基于分析师认可度的成长股投资策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247493683&idx=1&sn=4b7a673010b1cf0c7d60aba82ba1ab85&chksm=ec6caa51db1b2347aba201e4da1a42708f37cfe4287f3f56c6a1e1ae1d4095da1a85abf89c5b&scene=21#wechat_redirect",
    },
    {
        "category": "主动量化选股策略",
        "title": "探寻股价回报的源动力—基于ROE的高质量选股策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247522533&idx=1&sn=f90af0be4a0502157ad27e1c4ea64256&chksm=ec6cda87db1b5391456b6be36d309b30d6f8b376ba2359acb07212097e206d99bf474b4fc154&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "日内特殊时刻蕴含的主力资金Alpha信息",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247527689&idx=1&sn=654c100324e67135be723faf079d26cd&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "高频订单成交数据蕴含的Alpha信息",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247519209&idx=1&sn=774e9ae47a63428092e7fee35ab0ec03&chksm=ec6cc98bdb1b409d59c703d6b479aa3857124b043484e3ad76143617604a45210af19740c9df&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "基于主动买卖特征的高频订单因子改进",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247522899&idx=1&sn=097b05da4815622fc38c70f1d66c55c7&chksm=ec6cd831db1b5127b2c1dcf432f667122240e3000f2d66b4568d94ebd8416350707937111625&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "个股与行业的共振——联合动量因子",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247519332&idx=1&sn=a00dff8570843575248b001a9b29185e&chksm=ec6cce06db1b4710e7f47eb8d2007059640c81005376f7da45bbb10ba6b17543e4ed9f9a79c1&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "风险溢价视角下的动量反转统一框架",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247511307&idx=1&sn=0d7171d2ce1fc0417cbabd99c661a540&chksm=ec6cef69db1b667f89c95e08b5adeb635cfbe0f69e163db43627979a857f234753f4ae5efa0c&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "北向因子能否长期有效?—来自亚太地区的实证",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247494597&idx=1&sn=2d6e9cf479675c9d9b2491e65f9662f1&chksm=ec6ca9a7db1b20b1a1f9acad5b1ff1038f52ff0a8fa9da96a5d6324537d13277d3419f8ef9be&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "动量类因子全解析",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247502433&idx=1&sn=b1e4c2495457de63b6efb415f03f711b&chksm=ec6c8803db1b011544c6707bc095f145fc16ab02564894c551e0a8df90aebf37546f805be40e&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "反转因子全解析",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247507160&idx=1&sn=277c2e11826ea3324551d8d0baf22c7f&chksm=ec6c9ebadb1b17ac6de210f23b0ced07d3c19736ab8532829ebada9d376ea97bd201f7e5c4ab&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "价量类风险因子挖掘初探",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247507694&idx=1&sn=ff47b43bd2d145f7f42f1845a57d87de&chksm=ec6c9c8cdb1b159a07cafffbe78c3f61868e5934b59685d3dd633643ebc47bba15a88b0c86b1&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "隐式框架下的特质类因子改进",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247508999&idx=1&sn=03c15b05958a7a07b1396d677bff7770&chksm=ec6ce665db1b6f73081156b44e129d9bd5c54b06224bc9caafd5af7e5837366abdf11aba5929&scene=21#wechat_redirect",
    },
    {
        "category": "因子选股及指数增强策略",
        "title": "寻找业绩与估值的错配：非理性估值溢价因子",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247503023&idx=1&sn=a2e917b7b775749afd96304c8dd3e8aa&chksm=ec6c8ecddb1b07db811de524a22f5094b88cb6f0cc72bce4256a6d59ee156084e5593f088d56&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "上市公司中报超预期全景解析",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528732&idx=1&sn=dd4bdca6f92ad236c699855f196802e5&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "市场情绪监控日报",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528474&idx=1&sn=20ed0c0113700a90044e7f38cf19fcf1&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "哪些股票受指数定期调整冲击较大？",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247527061&idx=1&sn=9bd0bbe33001629194842988b594869a&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "沪深核心指数成分股调整预测",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247526648&idx=1&sn=1057dbf267aae5927510c724a05c9ef5&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "股指期货基差观察及分红测算",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528897&idx=1&sn=e20848bd2353dde854563194cc4dab73&scene=21#wechat_redirect",
    },
    {
        "category": "市场热点研究",
        "title": "如何理解自由现金流指数的投资价值？",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247526267&idx=1&sn=d0426030bd73e197fd5fcad509553156&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理观点独立性与投资业绩",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247524228&idx=1&sn=d4f6ec9e9a707eccc8c4cfa0c865942b&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金业绩粉饰与隐形交易能力",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247484141&idx=1&sn=c03f2d5c8794d63c73000f863c872c4d&chksm=ec6f408fdb18c999f41944ca14acd1ab0fddc08509e187c07c2943388ba1ab37d657a1301ee3&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理业绩前瞻能力与基金业绩",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247485458&idx=1&sn=33dabef6a509f9529ff64addbc9bdb28&chksm=ec6f4a70db18c3663c2d5f2ee124a8f893f0fb10ce3b6d421f23e2548dfb26f16e7dba1b9de7&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理调研能力与投资业绩",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247492841&idx=1&sn=47691c99ebe2f33748d734c0551a3349&chksm=ec6ca68bdb1b2f9ddf3ad71bd5a9c77f4cc8fcbea424c906f1bfa485c5d6f3190033b66c6908&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理业绩洞察能力与投资业绩",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247498245&idx=1&sn=2f26d5878db7e756a05538184f6138eb&chksm=ec6cb867db1b3171948414938c2f1a930fe45e9ceafe2518248f0663bb72e14d4727672c7111&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理波段交易能力与投资业绩",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247507382&idx=1&sn=c254dbd1d4be95b26bbf783be7ee829c&chksm=ec6c9fd4db1b16c2235f59564cfbaa68401ff7b7d14aabaef7f6a0e9bc992f3eab52b00c1d58&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "基金经理持仓收益与投资业绩",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247514063&idx=1&sn=ed2a01bed6b05bf137b263d877a02f9f&chksm=ec6cf5addb1b7cbb908f23a68f112005139d8027aa2d0ba975f1c83375fcf8b12c3fea1bf7ac&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "如何构建稳定战胜主动股基的FOF组合？",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247505120&idx=1&sn=1ac77192bd12ab558456cd9f2381d778&chksm=ec6c9682db1b1f94ba3a4b526460fa0677aa8d0eafe2529937e4a5d09410b9fee48c5334a435&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "公募基金持仓还原及其实践应用",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247503341&idx=1&sn=03d299b9603c84df6b995fb21869c182&chksm=ec6c8f8fdb1b0699b2f81c500df0ea5d4a2ac5ad5edc2ee314cf768769c79748eaecf12b4920&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "“固收+”基金标签体系与业绩归因全解析",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247516570&idx=1&sn=50a8203dc0a25ef7cfbff3d6be4c4ff8&chksm=ec6cc3f8db1b4aee8ad78e666bf81a65e7efedb2bcc806c115f618e144f79044545eeb63b78d&scene=21#wechat_redirect",
    },
    {
        "category": "量化选基研究",
        "title": "量化视角下的“固收+”基金选择",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247519516&idx=1&sn=1e88ec87c55f835c8801a3f28a5aaf67&chksm=ec6ccf7edb1b46688e4cd0121da67a56e251fae545559f86441c1c1706e7bf1322d2023cbfcd&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "公募打新全解析—历史、建模与实践",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247486747&idx=1&sn=7ba6153c02e53fef9977211852fb8add&chksm=ec6f4f79db18c66f72a7d8b08ed9b9e225bfa8bab0a4b9e4cfc44fcc548141475a08054ff0f5&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "海外资管机构月报",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528169&idx=1&sn=20c2d2cdcb0122e4e82c704fee81695d&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "哪些热点板块机构投资者占比在提升？",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247528718&idx=1&sn=8863ed6e08d9432f704b223e3c4dc472&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "公募FOF二季度加仓了哪些基金？",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247527924&idx=1&sn=6b75ff957f48684d48aa4ed51290a5fb&scene=21#wechat_redirect",
    },
    {
        "category": "基金市场及热点研究",
        "title": "公募改革新规下的机构潜在调仓行为分析",
        "url": "https://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247526774&idx=1&sn=9fc923401ef9d39ba195f16b0abe9003&scene=21#wechat_redirect",
    },
    {
        "category": "行业轮动系列",
        "title": "CANSLIM行业轮动策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247506820&idx=1&sn=4dd4e59a11278ab8e57e9803c8d20bc5&chksm=ec6c99e6db1b10f0479b1c842063765502dd6176960d15e9b24d237fc10cdeacf2a12551505d&scene=21#wechat_redirect",
    },
    {
        "category": "行业轮动系列",
        "title": "JumpFit行业轮动策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247494533&idx=1&sn=f4c833a538265ce548bb573519682f3d&chksm=ec6ca9e7db1b20f134bb2a7c486a91df19a523373ddbde32069bd1593c84340143efd832992a&scene=21#wechat_redirect",
    },
    {
        "category": "行业轮动系列",
        "title": "3M板块轮动策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247502089&idx=1&sn=698b1fed32af93da80f549dc124aa5b2&chksm=ec6c8b6bdb1b027d631b3a7e225fb6dfc23e942cbb906176637be5fff2bb5eee1c1ae90ff5c1&scene=21#wechat_redirect",
    },
    {
        "category": "CTA研究系列",
        "title": "股指分红点位测算方法全解析",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247492392&idx=1&sn=112c486f08cf2bbf7a91473af79b5298&chksm=ec6ca14adb1b285c03c77753b6a72ce22a0c182c9cedffd9090126d0c4cb654c2b1964c1ed43&scene=21#wechat_redirect",
    },
    {
        "category": "CTA研究系列",
        "title": "基于开盘动量效应的股指期货交易策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247494216&idx=1&sn=87eea5d725a247bea176c30249278b54&chksm=ec6ca82adb1b213c19612eb0b9691f1b0dfbd19ee4ed4d41768c089b8671c5e95dcaeccc4493&scene=21#wechat_redirect",
    },
    {
        "category": "CTA研究系列",
        "title": "基于Bollinger通道的商品期货交易策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247500418&idx=1&sn=b177c5c85032ea7c4e5a4059d40e960e&chksm=ec6c80e0db1b09f60b92e1b5148f99ba71dba939c571d36c46dba1214919e90cbe877ea9d9dc&scene=21#wechat_redirect",
    },
    {
        "category": "CTA研究系列",
        "title": "基于Carry的商品期货交易策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247506465&idx=1&sn=7875599574a45c2aed5b35011a6c562e&chksm=ec6c9843db1b11558fe27290861a056c941606712472f884fc47f909efdf3e59ab4898276fae&scene=21#wechat_redirect",
    },
    {
        "category": "CTA研究系列",
        "title": "基于道氏理论的商品期货交易策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247508739&idx=1&sn=4a70c90419813930475a3b259e55571c&chksm=ec6ce161db1b687735c0f52363c427f8295bd28e7ef240d7294455a18c930ab8a5f9472f53ce&scene=21#wechat_redirect",
    },
    {
        "category": "港股研究系列",
        "title": "基于分析师推荐视角的港股投资策略",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247494130&idx=1&sn=a33fc05175b09d90f2f97b169ad94d88&chksm=ec6cab90db1b2286e41bb8027e3b9153316e665946bba8cb37fa5dc0d27894a54330d1f36753&scene=21#wechat_redirect",
    },
    {
        "category": "港股研究系列",
        "title": "百年港股风云录—历史、制度与实践",
        "url": "http://mp.weixin.qq.com/s?__biz=MzI5MzcwNTQ4NQ==&mid=2247495272&idx=1&sn=285adfb23b417285ff4e9b192313a403&chksm=ec6cac0adb1b251c788fc7f27bb1c57fcdbba330b43428a4d3cd0b67643ba72548593e68b1b7&scene=21#wechat_redirect",
    },
]


def clean_float(value: Any) -> float | None:
    if value is None:
        return None
    number = float(value)
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def iso_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    text_value = str(value)
    if len(text_value) == 8 and text_value.isdigit():
        return f"{text_value[:4]}-{text_value[4:6]}-{text_value[6:]}"
    return text_value[:10]


def annualized_return(first_nav: float, last_nav: float, days: int) -> float | None:
    if not first_nav or first_nav <= 0 or days <= 0:
        return None
    return (last_nav / first_nav) ** (365.25 / days) - 1


def max_drawdown(values: list[float | None]) -> float:
    peak: float | None = None
    worst = 0.0
    for value in values:
        if value is None:
            continue
        peak = value if peak is None else max(peak, value)
        if peak:
            worst = min(worst, value / peak - 1)
    return worst


def get_database_engine() -> Engine:
    db_url = os.getenv("GUOSEN_DB_URL")
    if db_url:
        return create_engine(db_url, connect_args={"connect_timeout": 20})

    host = os.getenv("GUOSEN_DB_HOST")
    user = os.getenv("GUOSEN_DB_USER")
    password = os.getenv("GUOSEN_DB_PASSWORD")
    database = os.getenv("GUOSEN_DB_NAME") or "guosen_portfolio_data"
    port = os.getenv("GUOSEN_DB_PORT") or "3306"
    if host and user and password:
        safe_user = quote_plus(user)
        safe_password = quote_plus(password)
        return create_engine(
            f"mysql+pymysql://{safe_user}:{safe_password}@{host}:{port}/{database}",
            connect_args={"connect_timeout": 20},
        )

    try:
        import GuosenQuant_PortfolioDataAPI as api  # type: ignore[import-not-found]
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Missing database configuration. Set GUOSEN_DB_URL or GUOSEN_DB_HOST, "
            "GUOSEN_DB_USER, GUOSEN_DB_PASSWORD, GUOSEN_DB_NAME in the environment."
        ) from exc
    return api.conn


def fetch_benchmark_maps(connection) -> dict[str, dict[str, float]]:
    output: dict[str, dict[str, float]] = {}
    for code in {strategy["benchmarkCode"] for strategy in STRATEGIES}:
        log(f"Fetching benchmark {code}...")
        rows = connection.execute(
            text("SELECT Date, NetValue FROM benchmark_netvalue WHERE IndexCode=:code ORDER BY Date"),
            {"code": code},
        ).fetchall()
        output[code] = {iso_date(row[0]): clean_float(row[1]) for row in rows}
        log(f"Fetched benchmark {code}: {len(rows)} rows.")
    return output


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    log("Creating database engine...")
    engine = get_database_engine()
    log("Opening database connection...")
    with engine.connect() as connection:
        log("Database connection opened.")
        benchmark_maps = fetch_benchmark_maps(connection)
        all_nav = []
        all_annual = []
        all_holdings = []
        strategy_summaries = []

        for strategy in STRATEGIES:
            log(f"Fetching nav for {strategy['displayName']}...")
            nav_rows = connection.execute(
                text(
                    "SELECT Date, `组合净值` FROM portfolio_netvalue "
                    "WHERE `组合名称`=:name ORDER BY Date"
                ),
                {"name": strategy["dbName"]},
            ).fetchall()
            log(f"Fetched nav for {strategy['displayName']}: {len(nav_rows)} rows.")

            first_benchmark = None
            normalized_rows = []
            benchmark_by_date = benchmark_maps[strategy["benchmarkCode"]]
            for row in nav_rows:
                date = iso_date(row[0])
                nav = clean_float(row[1])
                raw_benchmark = benchmark_by_date.get(date)
                if first_benchmark is None and raw_benchmark:
                    first_benchmark = raw_benchmark
                benchmark_nav = raw_benchmark / first_benchmark if raw_benchmark and first_benchmark else None
                normalized_rows.append(
                    {
                        "strategyId": strategy["id"],
                        "date": date,
                        "nav": nav,
                        "benchmarkNav": benchmark_nav,
                        "excessNav": nav / benchmark_nav if nav and benchmark_nav else None,
                    }
                )
            all_nav.extend(normalized_rows)

            by_year: dict[int, list[dict[str, Any]]] = defaultdict(list)
            for row in normalized_rows:
                by_year[int(row["date"][:4])].append(row)
            for year, rows in sorted(by_year.items()):
                if len(rows) < 2:
                    continue
                first = rows[0]
                last = rows[-1]
                strategy_return = last["nav"] / first["nav"] - 1 if first["nav"] else None
                benchmark_return = (
                    last["benchmarkNav"] / first["benchmarkNav"] - 1
                    if first["benchmarkNav"] and last["benchmarkNav"]
                    else None
                )
                all_annual.append(
                    {
                        "strategyId": strategy["id"],
                        "year": year,
                        "strategyReturn": clean_float(strategy_return),
                        "benchmarkReturn": clean_float(benchmark_return),
                        "excessReturn": clean_float(strategy_return - benchmark_return)
                        if strategy_return is not None and benchmark_return is not None
                        else None,
                    }
                )

            latest_nav = normalized_rows[-1] if normalized_rows else None
            first_nav = normalized_rows[0] if normalized_rows else None
            start_dt = datetime.fromisoformat(first_nav["date"]) if first_nav else None
            end_dt = datetime.fromisoformat(latest_nav["date"]) if latest_nav else None
            days = (end_dt - start_dt).days if start_dt and end_dt else 0
            strategy_summaries.append(
                {
                    **{key: value for key, value in strategy.items() if key != "dbName"},
                    "startDate": first_nav["date"] if first_nav else None,
                    "endDate": latest_nav["date"] if latest_nav else None,
                    "latestNav": latest_nav["nav"] if latest_nav else None,
                    "annualizedReturn": clean_float(
                        annualized_return(first_nav["nav"], latest_nav["nav"], days)
                    )
                    if first_nav and latest_nav
                    else None,
                    "maxDrawdown": clean_float(max_drawdown([row["nav"] for row in normalized_rows])),
                }
            )

            latest_weight_date = connection.execute(
                text("SELECT MAX(Date) FROM portfolio_weight WHERE `组合名称`=:name"),
                {"name": strategy["dbName"]},
            ).scalar()
            log(f"Latest holding date for {strategy['displayName']}: {iso_date(latest_weight_date)}")
            weight_rows = connection.execute(
                text(
                    "SELECT Date, StockCode, StockName, Industry, Weight FROM portfolio_weight "
                    "WHERE `组合名称`=:name AND Date=:date ORDER BY Weight DESC, StockCode"
                ),
                {"name": strategy["dbName"], "date": latest_weight_date},
            ).fetchall()
            log(f"Fetched holdings for {strategy['displayName']}: {len(weight_rows)} rows.")
            for row in weight_rows:
                all_holdings.append(
                    {
                        "strategyId": strategy["id"],
                        "date": iso_date(row[0]),
                        "code": row[1],
                        "name": row[2],
                        "industry": row[3],
                        "weight": clean_float(row[4]),
                    }
                )

    latest_data_date = max(
        (strategy["endDate"] for strategy in strategy_summaries if strategy["endDate"]),
        default=datetime.now().strftime("%Y-%m-%d"),
    )
    portal = {
        "updatedAt": latest_data_date,
        "teamImage": "assets/guosen-team-members-2025.jpg",
        "strategies": strategy_summaries,
        "nav": all_nav,
        "annual": all_annual,
        "holdings": all_holdings,
        "reports": REPORTS,
    }
    output_path = OUT_DIR / "portal.json"
    log(f"Writing {output_path}...")
    output_path.write_text(json.dumps(portal, ensure_ascii=False, indent=2), encoding="utf-8")
    log(
        f"Exported strategies={len(strategy_summaries)} nav={len(all_nav)} "
        f"annual={len(all_annual)} holdings={len(all_holdings)} reports={len(REPORTS)}"
    )


if __name__ == "__main__":
    main()
