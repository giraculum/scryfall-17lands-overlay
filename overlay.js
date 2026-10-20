// ==UserScript==
// @name        Scryfall 17Lands Overlay
// @namespace   Violentmonkey Scripts
// @icon
// @version     0.4.1
//
// @match       *://scryfall.com/*
// @grant       GM_addStyle
// @grant       GM_addElement
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_setClipboard
// @grant       GM_getResourceText
//
// @resource    resCardStats https://giraculum.github.io/cardstats.json
// @resource    resTemplates https://giraculum.github.io/templates.json
// @resource    resCycles https://giraculum.github.io/cycles.json
//
// @homepageURL https://github.com/giraculum/scryfall-17lands-overlay
// @downloadURL https://raw.githubusercontent.com/giraculum/scryfall-17lands-overlay/refs/heads/main/overlay.js
//
// @author      Giraculum
// @description Overlays rankings from 17Lands data onto Scryfall searches
// ==/UserScript==


//refresh scryfall tab to apply changes
const SHOW_WINRATES = true; //displayed under main grade
const SHOW_TAGS = true; //displayed at bottom of card if present
const SHOW_SIDEBAR = true; //sidebar of all defined tags, for easy editing
const SHOW_CYCLES_FULL = false; //if true, cycles will appear like other tags. useful for tagging

const ALLOW_TAGGING = true;/*
drag and drop tags from anywhere onto cards, then choose Cut Custom Tags on top right
paste into localTagListing at the bottom for persistence
tags are separated by spaces if multiple are on the same printing
*/


//STATS


const _STATS = function(){

  SPOTLIGHT = GM_getValue("S17L-spotlight", "all").toLowerCase();

  GM_addStyle(`

    . {
      --S17L-grade-hide: initial;
      --S17L-wr-hide: initial;
      --S17L-sub-hide: initial;
      --S17L-maj-hide: initial;
    }

    .S17L-overlay-box {
      background: rgb(0, 0, 0, 0.80);
      text-align: center;
      color: white;
    }

    .S17L-region-art {
      position: absolute;
      top: 11.1%;
      left: 7.5%;
      width: 85%;
      height: 44.4%;

      display: flex;
      flex-flow: column nowrap;
      align-items: flex-start;
    }

    .S17L-region-main {
      z-index: 10;
      width: 86px;
      border-bottom-right-radius: 26px;
      display: flex;
      flex-flow: column nowrap;
      justify-content: center;
      align-items: center;
    }

    .S17L-main-spotlight {
      z-index: 12;
      max-height: 20px;
      display: inline-block;
      padding-top: 2px;
    }

    .S17L-main-grade {
      font-weight: bolder;
      font-size: 48px;
      text-shadow: 3px 3px #222222;
      margin-top: -7px;
      margin-bottom: -9px;
      display: var(--S17L-grade-hide, inherit);
    }
    .S17L-main-grade:first-child {
      padding-top: 4px;
    }

    .S17L-main-winrate {
      font-size: 12px;
      display: var(--S17L-wr-hide, inherit);
    }

    .S17L-region-sub {
      z-index: 10;
      width: 100%;
      flex-grow: 1; /*for region-art*/
      overflow: hidden;
      margin-top: 2px;

      display: flex;
      flex-flow: column wrap;
      flex: 1 1;
      align-items: flex-start;
    }

    .S17L-sub-entry {
      left: 0%;
      top: 0%;
      width: 86px;
      height: 20px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      background: rgb(0,0,0,0.9);

      font-size: 16px;
      display: var(--S17L-sub-hide, flex);
      flex-flow: row nowrap;
      justify-content: space-between;
      align-items: center;
    }

    .S17L-sub-maj {
      display: var(--S17L-maj-hide, flex);
      order: -1;
    }

    .S17L-sub-mana {
      padding-top: 2px;
      padding-left: 3px;
    }

    .S17L-sub-grade {
      font-size: 18px;
      padding-top: 1.5px;
      padding-right: 3px;
    }

    [S17L-grade="A+"] {color: #ff5174}
    [S17L-grade="A"]  {color: #ff5d5d}
    [S17L-grade="A-"] {color: #e85f5f}
    [S17L-grade="B+"] {color: #ff913d}
    [S17L-grade="B"]  {color: #ff9a3d}
    [S17L-grade="B-"] {color: #e08e41}
    [S17L-grade="C+"] {color: #f2e06d}
    [S17L-grade="C"]  {color: #e8d351}
    [S17L-grade="C-"] {color: #ddca4f}
    [S17L-grade="D+"] {color: #40c44d}
    [S17L-grade="D"]  {color: #4dc659}
    [S17L-grade="D-"] {color: #52b25b}
    [S17L-grade="F"]  {color: #43c5e0}
    [S17L-grade="?"]  {color: #9b67e5}
    [S17L-grade="!"]  {color: #ff0000}
    [S17L-grade="Maj."]  {color:lightgray; font-size: 12px}

    .S17L-checklist-grade {
      display: var(--S17L-grade-hide, table-cell);
    }

    .S17L-checklist-winrate {
      display: var(--S17L-wr-hide, table-cell);
    }

    td.S17L-checklist a {
      font-weight: bolder;
      text-align: center;
    }

  `);

  function makeColor(v) {
    basecolors = {};
    basecolors[3]  = {h:-10,     s: 100,   l: 68.24};
    basecolors[2]  = {h: 0,      s: 100,   l: 68.24};
    basecolors[1]  = {h: 28.76,  s: 100,   l: 61.96};
    basecolors[0]  = {h: 51.66,  s: 76.65, l: 61.37};
    basecolors[-1] = {h: 125.95, s: 51.49, l: 53.92};
    basecolors[-2] = {h: 190.32, s: 71.69, l: 70.06};
    var vg = Math.max(-2, Math.min(v/3, 3));
    if (vg<=-1.5) {vg=-2}
    var low = Math.floor(vg);
    var high = Math.ceil(vg);
    let m = vg-low;
    let c1 = basecolors[low];
    let c2 = basecolors[high];
    let c3 = {};
    for (let stat of ['h','s','l']) {
      c3[stat] = (c1[stat]*(1-m) + c2[stat]*m).toFixed(2);
    }
    return `hsl(${c3.h}deg ${c3.s}% ${c3.l}%)`;
  }


  let allCardStats = {...JSON.parse(GM_getResourceText("resCardStats")), ...localCardStats};


  class MainOverlay {
    constructor(region, grade, winrate) {
      if (SPOTLIGHT!="all") {
        this.eSpotlight = GM_addElement(region, "span", {class: "S17L-main-spotlight"});
        for (let char of SPOTLIGHT) {
          addManaSymbol(this.eSpotlight, char);
        }
      }
      this.eGrade   = GM_addElement(region, "span", {class: "S17L-main-grade"});
      this.eWinrate = GM_addElement(region, "span", {class: "S17L-main-winrate"});
      this.grade = grade;
      this.winrate = winrate;
    }

    get grade() {return this._grade;}
    set grade(newValue) {
      let oldValue = this._grade;
      this._grade = newValue;
      this.eGrade.setAttribute("S17L-grade", newValue);
      this.eWinrate.setAttribute("S17L-grade", newValue);
      this.eGrade.textContent = newValue?.replace("-","–") ?? "";
    }

    get winrate() {return this._winrate;}
    set winrate(newValue) {
      this._winrate = newValue;
      this.eWinrate.textContent = newValue!=null ? (newValue.toFixed(2) + "%") : " ";
    }
  }


  class SubOverlay {
    constructor(section, grade, colors) {
      this.box = GM_addElement(section, "span", {class: "S17L-sub-entry S17L-overlay-box"});
      this.manabox = GM_addElement(this.box, "span", {class: "S17L-sub-mana"});
      this.gradebox = GM_addElement(this.box, "span", {class: "S17L-sub-grade"});
      this.grade = grade;
      this.colors = colors;
    }

    get grade() {return this._grade;}
    set grade(newValue) {
      let oldValue = this._grade;
      this._grade = newValue;
      this.gradebox.setAttribute("S17L-grade", newValue);
      this.gradebox.textContent = newValue.replace("-","–").padEnd(2," "); //Figure space
    }

    get colors() {return this._colors;}
    set colors(newValue) {
      this._colors = newValue;
      this.manabox.replaceChildren([]);
      for (let char of newValue) {addManaSymbol(this.manabox, char);}
    }
  }


  function addManaSymbol(parent, color) {
    color = color.toUpperCase();
    return GM_addElement(parent, "abbr", {
      class: `card-symbol card-symbol-${color}`,
      textContent: "{"+color+"}",
      style: 'cursor: default'
    });
  }


  function performGradingImage(ctrl) {
    let card = ctrl.card;
    let cardcode = ctrl.cardcode;

    ctrl.artRegion = GM_addElement(card, "span", {class: "S17L-region-art"});
    ctrl.mainRegion = GM_addElement(ctrl.artRegion, "span", {class: "S17L-region-main S17L-overlay-box"});
    ctrl.subRegion = GM_addElement(ctrl.artRegion, "span", {class: "S17L-region-sub"});
    ctrl.main = null;
    ctrl.allSubs = {};
    let cardStatsPerDeck = allCardStats[cardcode];
    for(let [deck,stats] of Object.entries(cardStatsPerDeck ?? [])) {
      let colors = (deck=="all" ? "c" : deck);
      if (deck==SPOTLIGHT) {
        ctrl.main = new MainOverlay(ctrl.mainRegion, stats.g, stats.wr);
      }
      if (stats.pp>=50 && deck!="all") {
        let maj = new SubOverlay(ctrl.subRegion, "Maj.", colors);
        ctrl.allSubs["maj"] = maj;
        maj.box.classList.add("S17L-sub-maj");
      }
      if (deck!=SPOTLIGHT && stats.g!=cardStatsPerDeck[SPOTLIGHT]?.g && (stats.sig>=1.5 || stats.pp>=50)) {
        ctrl.allSubs[deck] = new SubOverlay(ctrl.subRegion, stats.g, colors);
      }
    }
    if (cardStatsPerDeck && !cardStatsPerDeck[SPOTLIGHT]) {
      ctrl.main = new MainOverlay(ctrl.mainRegion, "?", 0);
    }
    ctrl.gridelem?.setAttribute("S17L-graded", !!ctrl.main);
  }


  function performGradingChecklist(row, cardcode, href) {
    let cardStatsPerDeck = allCardStats[cardcode];
    let grade = (cardStatsPerDeck ? (cardStatsPerDeck[SPOTLIGHT]?.g ?? "?") : "");
    let wr = (cardStatsPerDeck ? (cardStatsPerDeck[SPOTLIGHT]?.wr ?? 0) : "");
    let v = cardStatsPerDeck?.[SPOTLIGHT]?.v ?? 0
    let hue = -10*v;
    let bgcolor = (grade=="?") ? "#9b67e5" : (grade) ? makeColor(v) : null;
    let style = bgcolor ? `background: ${bgcolor} !important` : '';

    let wrtd = GM_addElement("td", {
      class: "S17L-checklist S17L-checklist-winrate",
      style: style
    });
    GM_addElement(wrtd, "a", {
      tabindex: "-1",
      href: href,
      textContent: wr==="" ? "" : wr.toFixed(2)+"%"
    });
    wrtd.setAttribute("S17L-grade", grade);
    row.insertBefore(wrtd, row.children.item(2));

    let grtd = GM_addElement("td", {
      class: "S17L-checklist S17L-checklist-grade",
      style: style
    });
    GM_addElement(grtd, "a", {
      tabindex: "-1",
      href: href,
      textContent: grade.replace("-","–").padEnd(2," "), //Figure space
    });
    grtd.setAttribute("S17L-grade", grade);
    row.insertBefore(grtd, row.children.item(2));
    row.setAttribute("S17L-cardcode", cardcode);
    row.setAttribute("S17L-graded", !!grade);
  }


  function sortCards(cardList, sorter) {
    let direction = (document.querySelector("option[value='asc']")?.getAttribute("selected")=="selected") ? -1 : 1;
    [...cardList.children]
      .sort((a, b) => {
        if (a.className.includes("flexbox-spacer")) {return 1;}
        if (b.className.includes("flexbox-spacer")) {return -1;}
        if (a.getAttribute("S17L-graded")!="true") {return 1;}
        if (b.getAttribute("S17L-graded")!="true") {return -1;}
        let cardA = a.getAttribute("S17L-cardcode");
        let cardB = b.getAttribute("S17L-cardcode");
        return direction * sorter(cardA, cardB);
      })
      .forEach(node => cardList.appendChild(node));
  }
  function sortByGrade(cardA,cardB) {
    return (allCardStats[cardB]?.[SPOTLIGHT]?.wr??0) - (allCardStats[cardA]?.[SPOTLIGHT]?.wr??0);
  }


  function performSort() {
    if (document.querySelector("option[value='grid']")?.getAttribute("selected")=="selected"
    ||  document.querySelector("option[value='checklist']")?.getAttribute("selected")=="selected") {
      document.querySelector("option[value='artist']").textContent = "17Lands Rank";
    }
    let orderPanel = document.querySelector("#order[type='hidden']");
    if (orderPanel?.getAttribute("value")=="artist") {
      document.querySelectorAll(".card-grid-inner").forEach(function(grid){
        sortCards(grid, sortByGrade);
      });
      document.querySelectorAll("#js-checklist > tbody")?.forEach(function(tbody){
        sortCards(tbody, sortByGrade);
      });
    }
  }


  return {
    addManaSymbol: addManaSymbol,
    performGradingChecklist: performGradingChecklist,
    performGradingImage: performGradingImage,
    performSort: performSort
  };
};


//TAGS


const _TAGS = function(){


  GM_addStyle(`

    . {
      --S17L-tag-hide: initial;
      --S17L-sb-hide: initial;
    }

    .S17L-region-tag {
      position:absolute;
      bottom: -2%;
      left: 0%
      height: 12%;
      width: 100%;

      display: flex;
      flex-flow: row nowrap;
      justify-content: center;
      align-items: center;
      flex: auto;
      column-gap: 2px;
    }

    .S17L-tag {
      z-index: 10;
      border-radius: 10px;
      min-width: 50px;
      white-space: nowrap;

      padding: 6px;
      border: solid 2px lightgray;
      background: #000000;

      font-size: 12px;
      text-align: center;
      color: white;
      font-weight: bolder;
      cursor: help;
      display: var(--S17L-tag-hide, inline);
    }

    .S17L-tag[S17L-cuttable=true] {
      background: #444444 !important;
    }

    .S17L-container-sidebar {
      position: fixed;
      width: 140px;
      height: 100%;
      bottom: 0;
      left: 0;
      border: 5px solid #999;
      background: rgba(1,1,1,.2);
      resize: horizontal;
      max-width: 300px;
      overflow-y: scroll;
      overflow-x: clip;
      display: var(--S17L-sb-hide, flex);
      flex-flow: column nowrap;
      flex: 1 1;
      align-items: flex-start;
      row-gap: 2px;
    }

    .S17L-container-sidebar .S17L-tag {
      font-size: 12px;
      min-width: 40px;
      display: inherit;
    }

    /*
    .S17L-container-sidebar .S17L-tag::after {
      content: attr(s17l-tagcount);
      font-size: 10px;
      font-style: italic;
    }*/

    .S17L-tag[S17L-color=W] {color: lemonchiffon; border-color: tan; background: #000000;}
    .S17L-tag[S17L-color=U] {color: lightcyan; border-color: dodgerblue; background: #000000;}
    .S17L-tag[S17L-color=B] {color: thistle; border-color: darkmagenta; background: #000000;}
    .S17L-tag[S17L-color=R] {color: pink; border-color: brown; background: #000000;}
    .S17L-tag[S17L-color=G] {color: #D0FFD0; border-color: darkgreen; background: #000000;}
    .S17L-tag[S17L-color=C] {color: gainsboro; border-color: gray; background: #000000;}
    .S17L-tag[S17L-color=A] {color: gainsboro; border-color: gray; background: #000000;}
    .S17L-tag[S17L-color=M] {color: bisque; border-color: goldenrod; background: #000000;}
    .S17L-tag[S17L-color=X] {color: bisque; border-color: goldenrod; background: #000000;}
    .S17L-tag[S17L-category=removal] {background: radial-gradient(circle at left, #990000 0px, #480000 15px, black 15px);}
    .S17L-tag[S17L-category=semiremoval] {background: radial-gradient(circle at left, #996600 0px, #3A3300 15px, black 15px);}

  `);

  if (!SHOW_CYCLES_FULL) {
    GM_addStyle(`
      .S17L-region-tag .S17L-tag[S17L-category=cycle] {
        padding: 0;
        border: 2px #604a00;
        background: #302722;
        font-size: 18px;
        min-width: 0px;
        height: 27px;
        width: 27px;
        justify-content: top;
        position: absolute;
        right: -2%;
        padding-top: 2px;
        bottom: 0%;
        color: gold;
      }
    `)
  }


  let rsTemplates = JSON.parse(GM_getResourceText("resTemplates"));
  let rsCycles = JSON.parse(GM_getResourceText("resCycles"));
  if (!GM_getValue("S17L-temptags")) {
    GM_setValue("S17L-temptags", {});
  }
  //let allTagDefinitions = {...localTagDefinitions, ...rsTemplates.templateDefinitions};
  //let permTagListings = {...rsTemplates.templateListing, ...localTagListing}; //without temptags
  //let allTagListings = {...rsTemplates.templateListing, ...localTagListing, ...GM_getValue("S17L-temptags", {})};

  var allTagDefinitions = {};
  class Listing {
    constructor(defExt, defLoc, listExt, listLoc, listKey) {
      this.definitions = {...defExt, ...defLoc};
      allTagDefinitions = {...allTagDefinitions, ...this.definitions};
      this.permListings = {...listExt, ...listLoc};
      this.listKey = listKey;
      this.allListings = {...this.permListings, ...this.getTempListings()};
    }
    getTempListings() {
      return GM_getValue(this.listKey, {});
    }
    setTempListings(v) {
      GM_setValue(this.listKey, v);
    }
    inPerm(cardcode, tagcode) {
      return (this.permListings[cardcode]?.indexOf(tagcode) ?? -1) != -1;
    }
  }

  function fillCycleDef(src) {
    for (let [tagcode, def] of Object.entries(src)) {
      def.display ??= (SHOW_CYCLES_FULL ? tagcode : "🃟");
      def.color ??= "x";
      def.category ??= "cycle";
      def.query ??= `s:${tagcode.split('-')[1]} order:color otag:${tagcode}`;
      def.help ??= `Cycle: ${tagcode}`;
    }
    return src;
  }

  let DATA = {
    tags: new Listing(rsTemplates.templateDefinitions, localTagDefinitions, rsTemplates.templateListing, localTagListing, "S17L-temptags"),
    cycles: new Listing(fillCycleDef(rsCycles.definitions), fillCycleDef(localCycleDefinitions), rsCycles.listing, localCycleListing, "S17L-tempcycles")
  }

  let tagMap = {}
  function buildTagMap(src) {
    for (let tagcode of Object.keys(src.definitions)) {
      tagMap[tagcode] = [];
    }
    for (let [cardcode,tags] of Object.entries(src.allListings)) {
      for (let tagcode of tags.split(' ')) {
        if (!tagcode) {continue;}
        if (!tagMap[tagcode]) {continue;}
        let [set,cn] = cardcode.split('/');
        let q = `s:${set} cn:${cn}`;
        tagMap[tagcode].push(q);
      }
    }
  }
  buildTagMap(DATA.tags);
  buildTagMap(DATA.cycles);


  function addTag(box, cardcode, tagcode) {
    let myData = allTagDefinitions[tagcode];
    if (!myData) {return;}
    let q = `unique:prints+${encodeURIComponent(tagMap[tagcode]?.join(' or ')??"")?.replace(/%20/g, "+")}`;
    //let q = encodeURIComponent(myData.query??"")?.replace(/%20/g, "+");
    let order = (myData.category=='cycle' ? 'color' : 'released');

    let elem = GM_addElement(box, "a", {
      class: "S17L-tag",
      href: `https://scryfall.com/search?q=${q}&order=${order}&s17ltagcode=${tagcode}`,
      textContent: myData.display ?? tagcode,
      title: myData.help ?? "",
      draggable: ALLOW_TAGGING,
      "S17L-cardcode": cardcode,
      "S17L-tagcode": tagcode,
      "S17L-color": myData.color ?? "X",
      "S17L-category": myData.category ?? "",
    });
    elem.addEventListener("dragstart", (event)=>{onDragTag(event,cardcode,tagcode)});
    return elem;
  }


  function onDragTag(ev, cardcode, tagcode) {
    console.log("dragging "+tagcode+" from "+cardcode);
    ev.dataTransfer.setData("type", "S17L-tag");
    ev.dataTransfer.setData("values", JSON.stringify({cardcodesrc:cardcode, tagcode:tagcode}))
  }


  function onDropTag(ev, card) {
    if (!ALLOW_TAGGING) {return;}
    ev.preventDefault();
    if (ev.dataTransfer.getData("type")!="S17L-tag") {return;}

    let {cardcodesrc, tagcode} = JSON.parse(ev.dataTransfer.getData("values"));
    let cardcodetarget = card.getAttribute("S17L-cardcode");
    let region = card.querySelector(".S17L-region-tag");
    if (cardcodesrc==cardcodetarget || !region) {return;}

    let newTag = addTag(region, cardcodetarget, tagcode);
    newTag.setAttribute("S17L-cuttable", true);
    newTag.classList.add("S17L-tag-cuttable");
    pushTempTags(cardcodetarget, tagcode);
  }


  function pushTempTags(cardcode, tagcode) {
    for (let src of Object.values(DATA)) {
      if (!src.definitions[tagcode]) {continue;}
      let tempListings = src.getTempListings();
      var value;
      if (tempListings[cardcode]) {
        value = tempListings[cardcode] + " " + tagcode;
      } else if (src.permListings[cardcode]) {
        value = src.permListings[cardcode] + " " + tagcode;
      } else {
        value = tagcode;
      }
      tempListings[cardcode] = value;
      src.setTempListings(tempListings);
    }
  }


  function performTag(ctrl) {
    if (!SHOW_TAGS) {return;}
    let card = ctrl.card;
    let cardcode = ctrl.cardcode;

    card.addEventListener("dragover", (ev)=>{ev.preventDefault()});
    card.addEventListener("drop", (ev)=>{onDropTag(ev,card)});
    ctrl.tagRegion = GM_addElement(card, "span", {class: "S17L-region-tag"});

    ctrl.allTags = {};
    for (let src of Object.values(DATA)) {
      let tagsOfCard = src.allListings[cardcode];
      if (!tagsOfCard) {continue;}
      for(let tagcode of tagsOfCard.split(' ')) {
        let tagObj = addTag(ctrl.tagRegion, cardcode, tagcode);
        ctrl.allTags[tagcode] = tagObj;
        if (!src.inPerm(cardcode,tagcode)) {
          tagObj.setAttribute("S17L-cuttable", true);
          tagObj.classList.add("S17L-tag-cuttable");
        }
      }
    }
  }


  function addExportButton(elem) {
    let button = GM_addElement(elem, "button", {
      class: "button-n",
      textContent: "📋 Cut Custom Tags",
      style: "display: var(--S17L-sb-hide, inherit); margin-left: 15px;"
    });
    button.addEventListener("click", function(ev){
      var allOutputText = "";
      for (src of Object.values(DATA)) {
        let outputObj = src.getTempListings();
        console.log(outputObj);
        allOutputText += JSON.stringify(outputObj, null, 2).replace(/ *\{/,"\n").replace(/\n *\}/,",\n");
        src.setTempListings({});
      }
      GM_setClipboard(allOutputText);
      //GM_setValue("S17L-temptags",{});
      document.querySelectorAll("[S17L-cuttable=true]").forEach((elem)=>elem.remove())
    });
  }


  function addTagSidebar() {
    let sidebar = GM_addElement(document.body, "aside", {
      class: "S17L-container-sidebar",
    });
    let allSources = (SHOW_CYCLES_FULL ? [DATA.tags, DATA.cycles] : [DATA.tags]);
    for (let src of allSources) {
      for (let [tagcode,myData] of Object.entries(src.definitions)) {
        let tag = addTag(sidebar, "none", tagcode, true);
        tag.setAttribute('S17L-tagcount', tagMap[tagcode]?.length ? `(${tagMap[tagcode].length})` : '');
        if (myData?.query) {
          let url = `https://scryfall.com/search?q=${encodeURIComponent(myData.query??"")?.replace(/%20/g, "+")}&order=released`;
          let search = GM_addElement(tag, "a", {textContent: "🔎", href: url, style:'user-drag: none; user-select: none'});
        }
      }
    }


    let width = GM_getValue("S17L-sidebar-width", null);
    if (width) {
      sidebar.style = `width: ${width}px;`;
    }
    let rsz = new ResizeObserver((entries)=>{
      for (let entry of entries) {
        let width = entry.contentRect.width;
        GM_setValue("S17L-sidebar-width", width+10);
      }
    });
    rsz.observe(sidebar);

    sidebar.scrollTop = GM_getValue('S17L-sidebar-scroll', 0);
    var pause=false;
    sidebar.addEventListener("scroll", function(ev) {
      if (pause) {return;}
      setTimeout(()=>{pause=false;}, 20);
      GM_setValue('S17L-sidebar-scroll', ev.target.scrollTop);
      pause = true;
    });
  }


  function performTagControls() {
    if (ALLOW_TAGGING) {
      let header = document.querySelector("#S17L-header");
      if (header) {addExportButton(header);}
    }
    if (SHOW_TAGS && SHOW_SIDEBAR) {
      addTagSidebar();
    }
  }


  return {
    performTag: performTag,
    performTagControls: performTagControls
  };
};


//MAIN


function main(){

  function prepChecklist() {
    //CHECKLIST GRADES
    let headerRow = document.querySelector("#js-checklist > thead > tr");
    if (!headerRow) {return;}
    var checklistLink = "";
    for (let alink of headerRow.querySelectorAll("a")) {
      let href = alink.getAttribute("href");
      if (href && href.indexOf("order=artist")!=-1) {
        checklistLink = href;
        break;
      }
    }
    let order = document.querySelector("#order[type='hidden']")?.getAttribute("value");
    if (order!="artist") {
      checklistLink = checklistLink?.replace("dir=asc","dir=desc");
    }
    let wrth = GM_addElement("th",{class: "em4 S17L-checklist S17L-checklist-winrate"});
    GM_addElement(wrth,"a",{href: checklistLink, textContent: "WR"})
    headerRow.insertBefore(wrth, headerRow.children.item(2));
    let grth = GM_addElement("th",{class: "em2 S17L-checklist S17L-checklist-grade"});
    GM_addElement(grth,"a",{href: checklistLink, textContent: "GR"})
    headerRow.insertBefore(grth, headerRow.children.item(2));
  }
  prepChecklist();


  class CardController {
    constructor(card, cardcode, gridelem) {
      this.card = card;
      this.cardcode = cardcode;
      this.gridelem = gridelem;
      card.setAttribute("S17L-cardcode", cardcode);
      STATS.performGradingImage(this);
      TAGS.performTag(this);
    }
  }


  function getCardCode(url) {
    let match = url.match(/card\/([^\/]*\/\d*\w?)/);
    return match?.[1];
  }


  function processCardInGrid(card) {
    let cardcode = getCardCode(card.getAttribute("href"));
    if (!cardcode) {return;}
    let ctrl = new CardController(card, cardcode, card.parentElement);
    ctrl.gridelem.setAttribute("S17L-cardcode", cardcode);
    return ctrl;
  }
  document.querySelectorAll(".card-grid-item-card").forEach(processCardInGrid);


  function processCardInPage(card) {
    let cardcode = getCardCode(document.URL);
    if (!cardcode) {return;}
    return new CardController(card, cardcode, null);
  }
  document.querySelectorAll(".card-image").forEach(processCardInPage);


  function processCardInChecklist(row) {
    let href = row.firstChild.firstChild.getAttribute("href");
    if (!href) {return;}
    let cardcode = getCardCode(href);
    if (!cardcode) {return;}
    STATS.performGradingChecklist(row, cardcode, href);
  }
  document.querySelectorAll("#js-checklist tbody tr").forEach(processCardInChecklist);


  //CHECKBOXES
  function addHeader() {
    let originalRibbon = document.querySelector("#header");
    let newRibbon = GM_addElement("div", {class: "header"});
    originalRibbon.parentNode.insertBefore(newRibbon, originalRibbon.nextSibling);
    return GM_addElement(newRibbon, "div", {
      class: "header-control-row",
      id: "S17L-header",
      style: "flex-flow: row wrap; height: auto"
    });
  }
  let header = addHeader();

  function addCheckboxes(header) {
    function toggler(valueOn, valueOff) {
      return function(prop, checked) {
        GM_setValue(prop, checked);
        document.documentElement.style.setProperty(prop, checked?valueOn:valueOff);
      }
    }
    function buildCB(parent, label, prop, action) {
      let asc = GM_addElement(parent, "label", {class: "advanced-search-checkbox"});
      let initChecked = GM_getValue(prop) ?? true;
      let cb = GM_addElement(asc, "input", {type: "checkbox", style: "margin: 0px"});
      let lb = GM_addElement(asc, "span", {class: "header-link", textContent: label});
      cb.checked = initChecked;
      if (action) {
        action(prop, initChecked);
        cb.addEventListener('change', (ev)=>{action(prop, ev.target.checked)});
      }
      return cb;
    }
    buildCB(header, "Grade", "--S17L-grade-hide", toggler("initial", "none"));
    buildCB(header, "Winrate", "--S17L-wr-hide", toggler("initial", "none"));
    buildCB(header, "Subgrades", "--S17L-sub-hide", toggler("initial", "none"));
    buildCB(header, "Deck Majority", "--S17L-maj-hide", toggler("initial", "none"));
    buildCB(header, "Draft Tags", "--S17L-tag-hide", toggler("initial", "none"));
    buildCB(header, "Sidebar", "--S17L-sb-hide", toggler("initial", "none"));
  }
  addCheckboxes(header);

  function getValidDecks() {
    DECKS_ALLY = ["wu","ub","br","rg","gw"];
    DECKS_ENEMY = ["wb","ur","bg","rw","gu"];
    DECKS_TWOCOLOR = [...DECKS_ALLY, ...DECKS_ENEMY];
    DECKS_SHARD = ["wub","ubr","brg","rgw","gwu"];
    DECKS_WEDGE = ['wbg','urw','bgu','rwb','gur'];
    DECKS_SHARD_OVERLAP = [...DECKS_SHARD, ...DECKS_ALLY];
    DECKS_WEDGE_OVERLAP = [...DECKS_WEDGE, ...DECKS_ENEMY];
    DECKS_ANY = [...DECKS_TWOCOLOR, ...DECKS_SHARD, ...DECKS_WEDGE];

    decksBySet = {
      "blb": DECKS_TWOCOLOR,
      "bro": DECKS_TWOCOLOR,
      "dft": DECKS_TWOCOLOR,
      "dmu": [...DECKS_TWOCOLOR, ...DECKS_SHARD, ...DECKS_WEDGE],
      "dsk": DECKS_TWOCOLOR,
      "ecl": [...DECKS_TWOCOLOR, "urw","bgu","gur","wbg","rgw"],
      "eoe": DECKS_TWOCOLOR,
      "fdn": DECKS_TWOCOLOR,
      "fin": DECKS_TWOCOLOR,
      "hob": DECKS_ENEMY,
      "ktk": DECKS_WEDGE,
      "lci": DECKS_TWOCOLOR,
      "ltr": DECKS_TWOCOLOR,
      "mkm": DECKS_TWOCOLOR,
      "mom": [...DECKS_TWOCOLOR, "bgu"],
      "msh": DECKS_TWOCOLOR,
      "neo": DECKS_TWOCOLOR,
      "om1": DECKS_ALLY,
      "one": DECKS_TWOCOLOR,
      "otj": DECKS_TWOCOLOR,
      "snc": DECKS_SHARD_OVERLAP,
      "sos": DECKS_WEDGE_OVERLAP,
      "spm": DECKS_ALLY,
      "tdm": DECKS_WEDGE_OVERLAP,
      "tla": DECKS_TWOCOLOR,
      "tmt": [...DECKS_ENEMY, "bgu"],
      "woe": DECKS_TWOCOLOR,
    }

    var soloSet = null;
    for (let elem of document.querySelectorAll("[S17L-cardcode]")) {
      let set = elem.getAttribute("S17L-cardcode").split('/')?.[0];
      if (soloSet && set && set!=soloSet) {
        soloSet = null;
        break;
      } else {
        soloSet = set;
      }
    };
    let validDecks = decksBySet[soloSet] ?? DECKS_ANY;
    validDecks.unshift("all");
    return [(decksBySet[soloSet]?soloSet:null), validDecks];
  }

  GM_addStyle(`
    .S17L-deck-label[S17L-deck-valid=false] {
      color: red !important;
    }
  `);
  function addDeckSelector(header) {
    let [soloSet, validDecks] = getValidDecks();
    validDecks.push("all");
    let deckGroup = GM_addElement(header, "span", {style: "display: flex; flex-flow: row nowrap; align-items: center"});
    let label = GM_addElement(deckGroup, "label", {
      for: "deck",
      class: "header-link S17L-deck-label",
      textContent: (soloSet ? `${soloSet.toUpperCase()} Deck:` : "Deck:")
    });
    let deckSelector = GM_addElement(deckGroup, "select", {
      class: "select-n inverted S17L-deck-label",
      name: "deck",
      title: "Change deck for main grade"
    });
    let allDecks = [
      'all',
      'wu','ub','br','rg','gw','wb','ur','bg','rw','gu',
      'wub','ubr','brg','rgw','gwu',
      'wbg','urw','bgu','rwb','gur'
    ];

    let spotlight = GM_getValue("S17L-spotlight", "all");
    for (let deck of allDecks) {
      if (deck!="all" && deck!=SPOTLIGHT && validDecks.indexOf(deck)==-1) {continue;}
      let deckOpt = GM_addElement(deckSelector, "option", {
        value: deck,
        textContent: deck=="all" ? "All" : deck.toUpperCase()
      });
      if (deck==spotlight) {
        deckOpt.setAttribute("selected","selected");
      }
    }
    label.setAttribute("S17L-deck-valid", validDecks.indexOf(spotlight)!=-1);
    deckSelector.setAttribute("S17L-deck-valid", validDecks.indexOf(spotlight)!=-1);
    deckSelector.addEventListener("change", (ev)=>{
      let value = ev.target.value;
      label.setAttribute("S17L-deck-valid", validDecks.indexOf(value)!=-1);
      deckSelector.setAttribute("S17L-deck-valid", validDecks.indexOf(value)!=-1);
      GM_setValue("S17L-spotlight", value);
      window.location.reload();
    });
  }
  addDeckSelector(header);


  STATS.performSort();
  TAGS.performTagControls();
};



localTagListing = {
  //"fra/1": "ex"


}

//cosmetic features:
//category: body|removal|semiremoval|trick|resource  (sorts tags)
//color: w|u|b|r|g|c|m  (purely cosmetic)
//query is used for magnifying glass in sidebar
localTagDefinitions = {
  /*
  "ex": {
    "display": "Example",
    "color": "U",
    "category": "body",
    "query": "is:permanent (st:expansion r<r)",
    "help": "Help text",
  },
  */
}
let localCardStats = {

}

let localCycleDefinitions = {

}
let localCycleListing = {

}

const STATS=_STATS();
const TAGS=_TAGS();
main();
