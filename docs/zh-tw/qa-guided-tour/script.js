const RECOMMENDSMAP = {
  abuot: {
    url: "about/",
    translate: {
      "zh-tw": {
        title: "關於造物領域"
      },
      "ja": {
        title: "造物フィールドについて"
      },
      "en": {
        title: "About Zawfield"
      }
    }
  },
  aboutFounder: {
    url: "about/founder/",
    translate: {
      "zh-tw": {
        title: "直達創辦人的私人領域"
      },
      "ja": {
        title: "創設者のプライベート領域へ"
      },
      "en": {
        title: "Direct Access to the Founder's Private Realm"
      }
    }
  },
  posts: {
    url: "posts/",
    translate: {
      "zh-tw": {
        title: "造物筆記"
      },
      "ja": {
        title: "造物ログ"
      },
      "en": {
        title: "Logs and Nodes"
      }
    }
  },  
  tags: {
    url: "tags/",
    translate: {
      "zh-tw": {
        title: "Tag 集"
      },
      "ja": {
        title: "タグコレクション"
      },
      "en": {
        title: "Tag Collection"
      }
    }
  },
  products: {
    url: "products/",
    translate: {
      "zh-tw": {
        title: "造物集"
      },
      "ja": {
        title: "クリエイションズ"
      },
      "en": {
        title: "Creations"
      }
    }
  },
  areas: {
    url: "areas/",
    translate: {
      "zh-tw": {
        title: "已發現區域"
      },
      "ja": {
        title: "発見されたエリア"
      },
      "en": {
        title: "Discovered Areas"
      }
    }
  }
};

const QUESTIONSCONFIGBYLANG = {
  "zh-tw": {
    q1: {
      text: "你是藉由什麼管道或方式來到造物領域的網站的？",
      options: [
        { text: "個人名片（有齒輪造型）。", token: 1 },
        { text: "造物領域名片（有立方體造型）。", token: 2 },
        { text: "從家人、朋友、同事、上司等他人介紹。", token: 3 },
        { text: "搜索引擎。", token: 4 },
        { text: "其他。（講真，我不記得有其它可能的管道w）", token: 5 }
      ],
      next: (history) => {
        return { toQ: "q2" };
      }
    },
    q2: {
      text: "本次造訪造物領域，有以什麼身分名義或立場嗎？",
      options: [
        { text: "代表公司行號等大型單位的立場。", token: 1 },
        { text: "代表工作室、實驗室等較小型團體單位的立場。", token: 2 },
        { text: "代表獨立創作者、個人工作室等個人單位的立場。", token: 3 },
        { text: "無，一般路過觀眾。", token: 4 }
      ],
      next: (history) => {
        if (history.q1 === 1 && history.q2 === 1) {
          return {
            toQ: null, recommends: [RECOMMENDSMAP.aboutFounder],
            msg: "原來如此…比起作品集，你會更想知道我的專業技能跟直接聯絡方式對吧？請點擊下方連結卡片，我都把資料整理好了。"
          }
        }
        return { toQ: "q3" }
      }
    },
    q3: {
      text: "你有特定的目的嗎？",
      options: [
        { text: "聯絡造物領域。", token: 1 },
        { text: "單獨聯絡創辦人。", token: 2 },
        { text: "沒有，只是四處看看。", token: 3 }
      ],
      next: (history) => {
        return {
          toQ: null, recommends: [RECOMMENDSMAP.products, RECOMMENDSMAP.tags],
          msg: "瞭解 ( •̀ω •́ゞ) ！那麼我的推薦如下卡片所示。"
        }
        /* if (history.q3 === 3) {
          return null;
        }
        return { toQ: "q4" }; */
      }
    },
    q4: {
      text: "你目前有具體的項目需求嗎？",
      options: [
        { text: "是的，有具體的需求", token: 1 },
        { text: "還沒有，只是看看", token: 2 }
      ],
      next: (history) => {
        if (history.q4 === 1) {
          return { toQ: "q5" };
        }
        return { recommends: [] };
      }
    },
    q5: {
      text: "你有技術背景嗎？",
      options: [
        { text: "有，我自己能開發", token: 1 },
        { text: "有，但需要額外開發資源", token: 2 },
        { text: "沒有，希望找人幫忙", token: 3 }
      ],
      next: (history) => {
        return { toQ: "q6" };
      }
    },
    q6: {
      text: "你需要什麼類型的幫助？",
      options: [
        { text: "技術開發", token: 1 },
        { text: "設計與品牌", token: 2 },
        { text: "專案顧問", token: 3 },
        { text: "其他需求", token: 4 }
      ],
      next: (history) => {
        if ([1,2,3].includes(history.q6)) {
          return { toQ: "q7" };
        }
        return { recommends: [] };
      }
    },
    q7: {
      text: "你的預算計畫是？",
      options: [
        { text: "有明確預算", token: 1 },
        { text: "預算不多，希望技術交換", token: 2 },
        { text: "還在評估，不確定預算", token: 3 }
      ],
      next: (history) => {
        return { recommends: [] };
      }
    }
  },
  "ja": {
    q1: {
      text: "どのような経路や方法で造物フィールドのウェブサイトにたどり着きましたか？",
      options: [
        { text: "個人名刺（ギアの形）。", token: 1 },
        { text: "クリエイター名刺（立方体の形）。", token: 2 },
        { text: "家族、友人、同僚、上司などの紹介。", token: 3 },
        { text: "検索エンジン。", token: 4 },
        { text: "その他。（正直、他のルートがあるか覚えていませんw）", token: 5 }
      ],
      next: (history) => {
        return { toQ: "q2" };
      }
    },
    q2: {
      text: "今回、造物フィールドへの訪問では、どのような立場でサイトを利用していますか？",
      options: [
        { text: "企業や法人などの大規模な団体を代表して。", token: 1 },
        { text: "スタジオや研究室などの小規模団体を代表して。", token: 2 },
        { text: "個人クリエイター、個人スタジオなどを代表して。", token: 3 },
        { text: "特になし、ただの閲覧者。", token: 4 }
      ],
      next: (history) => {
        if (history.q1 === 1 && history.q2 === 1) {
          return {
            toQ: null, recommends: [RECOMMENDSMAP.aboutFounder],
            msg: "なるほど…ポートフォリオよりも、私の専門スキルや直接の連絡方法を知りたいですよね？下のリンクカードをクリックしてください。必要な情報を整理してあります。"
          };
        }
        return { toQ: "q3" };
      }
    },
    q3: {
      text: "特定の目的がありますか？",
      options: [
        { text: "造物フィールドに連絡したい。", token: 1 },
        { text: "創設者に直接連絡したい。", token: 2 },
        { text: "特になし、ただ見て回っているだけ。", token: 3 }
      ],
      next: (history) => {
        return {
          toQ: null, recommends: [RECOMMENDSMAP.products, RECOMMENDSMAP.tags],
          msg: "了解です ( •̀ω •́ゞ)！おすすめは以下のカードをご覧ください。"
        };
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("qa-container");
    const scriptTag = document.getElementById("qa-script");
    if (scriptTag === null) {
      console.error(`Can't found script tag 'qa-script'`);
      return;
    }
    const langId = scriptTag.dataset.langId
    const questions = QUESTIONSCONFIGBYLANG[langId];
    if (questions === null) {
      console.error("question data is empty! this should not happen!");
      return;
    }

    const qaHistory = {
      q1: -1, q2: -1, q3: -1, q4: -1, q5: -1, q6: -1, q7: -1
    }

    function createQACard(qKey) {
      console.log(questions);
      const question = questions[qKey];
      if (question === undefined) {
        throw Error(`Q is empty!! from qKey '${qKey}'`)
      }
      const QACard = document.createElement("div");
      QACard.classList.add("bento-grid", "grid-cols-2", "qa-card");
      const qDisplay = document.createElement("h4");
      qDisplay.classList.add("col-span-2", "question");
      qDisplay.innerHTML = question.text;
      QACard.appendChild(qDisplay);
      container.appendChild(QACard);

      question.options.forEach(option => {
        const optBtn = document.createElement("div");
        optBtn.classList.add("bento-box", "col-span-1", "option");
        optBtn.innerText = option.text;
        optBtn.onclick = () => {
          qaHistory[qKey] = option.token;
          handleAnswer(optBtn, QACard, question.next);
        };
        QACard.appendChild(optBtn);
      });
    }

    function handleAnswer(opt, card, nextCondition) {
      opt.classList.remove("option", "col-span-1");
      opt.classList.add("answer", "col-span-2");
      opt.onclick = undefined;
      Array.from(card.getElementsByClassName("option")).forEach(optBtn => {
        if (optBtn !== opt) {
          optBtn.remove();
        }
      });
      const nextResult = nextCondition(qaHistory);
      if (Boolean(nextResult.toQ)) {
        createQACard(nextResult.toQ);
      } else {
        const endCard = document.createElement("div");
        endCard.classList.add("bento-grid", "qa-card");
        container.appendChild(endCard);

        const recTitle = document.createElement("div");
        recTitle.classList.add("bento-box");
        recTitle.innerHTML = nextResult.msg ? nextResult.msg : "OK！我知道了，那麼我推薦從下列這些方向開始參觀。";;
        endCard.appendChild(recTitle);

        nextResult.recommends.forEach((ele) => {
          const recLink = document.createElement("a");
          recLink.classList.add("bento-box", "recommend");
          recLink.href = `/${langId}/${ele.url}`
          recLink.target = "_blank"
          recLink.innerHTML = `<span>${ele.translate[langId].title}</span><i class="icon" style="transform: scale(1.2);"> move_item </i>`;
          endCard.appendChild(recLink);
        })
      }
    }

    function resetQA() {
      container.innerHTML = "";
      createQACard("q1");
    }

    const resetBtn = document.getElementById("reset-btn");
    resetBtn.innerHTML = resetBtn.dataset.primaryMsg;
    resetBtn.addEventListener("click", () => {
      if (resetBtn.dataset.state === "primary") {
        resetBtn.dataset.state = "confirm";
        resetBtn.innerHTML = resetBtn.dataset.confirmMsg;
      } else {
        resetBtn.dataset.state = "primary";
        resetBtn.innerHTML = resetBtn.dataset.primaryMsg;
        resetQA();
      }
    });

    resetQA();
    
  });
