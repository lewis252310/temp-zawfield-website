// not use now
function encodeBase64QueryParams(data) {
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        let cleanVal;
        const tfV = typeof value;
        if (tfV === "object") {
            cleanVal = "__obj";
        } else if (tfV === "function") {
            cleanVal === "__func";
        } else if (tfV === "undefined" || tfV === "symbol" || value === null) {
            cleanVal === "";
        } else {
            cleanVal === value;
        }
        acc[key] = cleanVal;
    }, {});
    const params = new URLSearchParams(cleanData);
    const base64Data = btoa(params);
    return base64Data;
}
// not use now
function decodeBase64QueryParams() {
    const base64Data = window.location.search["data"];
    if (!base64Data) {
        return;
    }
    const raw = atob(base64Data);
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
}

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const _r = {};
    for (const key of params.keys()) {
        if (!_r[key]) {
            const values = params.getAll(key).reduce((acc, v) => {
                return acc.concat(v.split(`,`));
            }, []);
            _r[key] = values.length > 1 ? values : values[0];
        }
    }
    return _r;
}

const storage = {
    inited: false,
    blocks: [],
    statics: [],
    tags: {},
    sections: new Set(),
    activeTags: new Set()
};

async function initStorage(mainContent) {
    let blocks, tags, sections;
    try {
        const response = await fetch("{{ .jsonPath }}");
        if (!response.ok) {
            throw new Error("網路錯誤");
        };
        const json = await response.json();
        blocks = json["blocks"];
        tags = json["tags"];
        sections = json["sections"];
        if (!blocks || !tags || !sections) {
            throw Error("Json data format is incomplete.");
        }
    } catch (e) {
        throw e;
    }
    storage.tags = { ...tags };
    Object.entries(sections).forEach(([key, value]) => {
        const ele = mainContent.querySelector(`#${key}`);
        if (ele && ele.innerHTML === "") {
            storage.sections.add(key);
        }
    });
    blocks.forEach(block => {
        const tempBlock = {};
        Object.entries(block).forEach(([key, value]) => {
            if (key === "tag") {
                tempBlock["tags"] = value.split(",").map(v => v.trim());
                tempBlock["tags"].forEach(tag => {
                    if (!storage.tags[tag]) {
                        storage.tags[tag] = tag;
                    }
                });
            } else {
                tempBlock[key] = value;
            }
        });
        if (tempBlock["static"] === "true") {
            storage.statics.push(tempBlock);
        } else {
            storage.blocks.push(tempBlock);
        }
    });
    storage.inited = true;
    return { dataState: storage.inited };
}

function refreshActiveTags(clickTarget) {
    const tag = (typeof clickTarget === "string") ? clickTarget : clickTarget.dataset.buttonId;
    if (storage.activeTags.has(tag)) {
        storage.activeTags.delete(tag);
    } else {
        storage.activeTags.add(tag);
    }
}

function refreshTagMenu() {
    const tagMenu = document.getElementById("tag-menu");
    if (!tagMenu) {
        return;
    }
    [...tagMenu.children].forEach(ele => {
        if (storage.activeTags.has(ele.dataset.buttonId)) {
            ele.dataset.activeState = "true";
        } else {
            ele.dataset.activeState = "false";
        }
    });
}

function initTagMenu() {
    const tagMenu = document.getElementById("tag-menu");
    Object.entries(storage.tags).forEach(([key, value]) => {
        if (value["hidden"]) {
            return;
        }
        const tagBtn = document.createElement("div");
        tagBtn.classList.add("tag-btn", "component", "button");
        tagBtn.dataset.buttonId = key;
        const display = typeof value === "object" ? value["display"] : `#${value}`;
        tagBtn.textContent = display;
        tagBtn.addEventListener("click", (event) => {
            buttonActive(event);
        });
        tagMenu.appendChild(tagBtn);
    });
}

function buttonActive(event) {
    refreshActiveTags(event.target);
    refreshTagMenu();
    refreshContent();
}

function refreshContent() {
    // const mainContent = document.getElementById("post-content");
    // mainContent.innerHTML = storage.frame;
    storage.sections.forEach(section => {
        const ele = document.getElementById(section);
        if (!ele) {
            return;
        }
        ele.innerHTML = "";
        ele.hidden = false;
    })
    storage.statics.forEach(block => {
        const ele = document.getElementById(block["section"]);
        if (!ele) {
            console.error(`Container not found! Block Data:`, block);
            return;
        }
        ele.innerHTML += block["content"];
    })
    const blocks = storage.blocks.map(block => {
        return { ...block, usage: false };
    })
    Array.from(storage.activeTags).reverse().forEach(actTag => {
        blocks.forEach(block => {
            if (block.usage) {
                return;
            }
            if (block.tags.includes(actTag)) {
                const container = document.getElementById(block["section"]);
                if (!container) {
                    console.error(`Container not found! Block Data:`, block);
                    return;
                }
                container.innerHTML += block["content"];
                block.usage = true;
            };
        })
    })
    storage.sections.forEach(section => {
        const ele = document.getElementById(section);
        if (!ele || ele.innerHTML !== "") {
            return;
        }
        const hiddenEle = document.getElementById(ele.dataset.ifEmptyHidden);
        if (!hiddenEle) {
            return;
        }
        hiddenEle.hidden = true;
    })
}

document.addEventListener("DOMContentLoaded", async () => {

    document.documentElement.style.setProperty("--input-font-size", "18px")

    const queryParams = getQueryParams();
    console.log("queryParams: ", queryParams);

    const mainContent = document.getElementById("post-content");

    if (!queryParams["mode"]) {
        mainContent.innerHTML = "";
        const desc = document.querySelector("section.layout.page-header > span.description");
        desc.innerHTML = "██████";
        const errorObj = document.createElement("h3");
        errorObj.textContent = "!!! Unauthorized request !!!";
        errorObj.style.setProperty("color", "red");
        mainContent.appendChild(errorObj);

        const tagMenuContainer = document.getElementById("tag-menu-container");
        tagMenuContainer.innerHTML = "";
        return;        
    }

    const dataState = await initStorage(mainContent);
    if (dataState === false) {
        throw Error("ERROR! Data State is not true.")
    }

    const tags = (() => {
        const _qT = queryParams["tags"];
        if (!_qT) {
            return [];
        }
        return Array.isArray(_qT) ? _qT : [_qT];
    })().reverse();

    if (queryParams["mode"] === "use-tags") {
        console.log("Get in 'use-tags' mode");
        initTagMenu();
        tags.forEach(tag => {
            refreshActiveTags(tag);
        })
        refreshTagMenu();
        refreshContent();
    } else if (queryParams["mode"] === "view-only") {
        console.log("Get in 'view-only' mode");
        tags.forEach(tag => {
            refreshActiveTags(tag);
        })
        refreshContent();
    } else {
        
    }
});

(() => {
    const header = document.getElementById("header");
    const navbar = document.getElementById("tag-menu-container");

    const updateStickyOffset = () => {
        navbar.style.top = `${header.offsetHeight}px`;
    };

    const checkStickyBg = () => {
        const threshold = header.offsetHeight;
        const rect = navbar.getBoundingClientRect();
        if (window.scrollY > 0 && rect.top <= threshold) {
            navbar.classList.add("bg-active");
        } else {
            navbar.classList.remove("bg-active");
        }
    };

    const onResize = () => {
        updateStickyOffset();
        checkStickyBg();
    };

    window.addEventListener("scroll", checkStickyBg);
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
})();