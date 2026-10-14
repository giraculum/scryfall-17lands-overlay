// ==UserScript==
// @name        Scryfall 17Lands Overlay
// @namespace   Violentmonkey Scripts
// @icon
// @version     0.3.0
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
//
// @author      Giraculum
// @description Overlays rankings from 17Lands data onto Scryfall searches
// ==/UserScript==


//refresh scryfall tab to apply changes
const SHOW_WINRATES = true; //displayed under main grade
const SHOW_TAGS = true; //displayed at bottom of card if present
const SHOW_SIDEBAR = true; //sidebar of all defined tags, for easy editing

const ALLOW_TAGGING = false;/*
drag and drop tags from anywhere onto cards, then choose Cut to Clipboard on top right
paste into localTagListing at the bottom for persistence
tags are separated by spaces if multiple are on the same printing
*/


//STATS


const _STATS = function(){

  GM_addStyle(`

    . {
      --S17L-grade-vis: initial;
      --S17L-wr-vis: visible;
      --S17L-sub-disp: flex;
      --S17L-maj-disp: flex;
    }

    .S17L-overlay {
      z-index: 10;
      background: rgb(0,0,0,0.8);

      text-align: center;
      font-weight: bolder;
      color: white;
    }

    .S17L-overlay-main {
      position: absolute;
      left: 7.5%;
      top: 11.1%;
      width: 86px;
      height: 66px;
      border-bottom-right-radius: 26px;

      padding-top: 6px;
      padding-right: 3px;
      visibility: var(--S17L-grade-vis, var(--S17L-wr-vis, hidden));
    }

    .S17L-info-maingrade {
      position: absolute;
      position: absolute;
      left: 7.5%;
      top: 11.1%;
      width: 86px;
      height: 66px;
      padding-top: 6px;
      padding-right: 3px;
      z-index: 11;

      text-align: center;
      font-weight: bolder;
      font-size: 48px;
      text-shadow: 3px 3px #222222;
      visibility: var(--S17L-grade-vis, hidden);
    }

    .S17L-info-winrate {
      position: absolute;
      left: calc(7.5% + 24px);
      top: calc(11.1% + 51px);
      font-size: 12px;
      z-index: 11;
      visibility: var(--S17L-wr-vis, hidden);
    }

    .S17L-region-sub {
      position: absolute;
      top: calc(11.1% + 66px + 4px);
      left: 7.5%;
      z-index: 9;
      width: 85%;
      height: calc(44.4% - 66px + 4px);

      display: flex;
      flex-flow: column wrap;
      flex: 1 1;
      align-items: flex-start;
    }

    .S17L-overlay-sub {
      left: 0%;
      top: 0%;
      width: 86px;
      height: 20px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      background: rgb(0,0,0,0.9);

      font-size: 16px;
      display: var(--S17L-sub-disp);
      flex-flow: row nowrap;
      justify-content: space-between;
      align-items: center;
    }

    .S17L-overlay-maj {
      display: var(--S17L-maj-disp);
    }

    .S17L-item-mana {
      padding-top: 2px;
      padding-left: 3px;
    }

    .S17L-item-grade {
      font-size: 18px;
      padding-top: 1.5px;
      padding-right: 3px;
    }

    .S17L-grade-A\\+ {color: #ff5174}
    .S17L-grade-A    {color: #ff5d5d}
    .S17L-grade-A-   {color: #e85f5f}
    .S17L-grade-B\\+ {color: #ff913d}
    .S17L-grade-B    {color: #ff9a3d}
    .S17L-grade-B-   {color: #e08e41}
    .S17L-grade-C\\+ {color: #f2e06d}
    .S17L-grade-C    {color: #e8d351}
    .S17L-grade-C-   {color: #ddca4f}
    .S17L-grade-D\\+ {color: #40c44d}
    .S17L-grade-D    {color: #4dc659}
    .S17L-grade-D-   {color: #52b25b}
    .S17L-grade-F    {color: #43c5e0}
    .S17L-grade-\\?  {color: #9b67e5}
    .S17L-grade-\\!  {color: #ff0000}
    .S17L-grade-Maj\\.  {color:lightgray; font-size: 12px}
  `);


  let allCardStats = JSON.parse(GM_getResourceText("resCardStats"));


  class MainOverlay {
    constructor(card, grade, winrate) {
      this.eOverlay = GM_addElement(card, "span", {class: "S17L-overlay S17L-overlay-main"});
      this.eGrade   = GM_addElement(card, "span", {class: "S17L-info-maingrade"});
      this.eWinrate = GM_addElement(card, "span", {class: "S17L-info-winrate"});
      //this.eWinrate.textContent = winrate.toFixed(2) + "%";
      this.grade = grade;
      this.winrate = winrate;
    }

    get grade() {return this._grade;}
    set grade(newValue) {
      let oldValue = this._grade;
      this._grade = newValue;
      changeGradeStyle(this.eGrade, oldValue, newValue);
      changeGradeStyle(this.eWinrate, oldValue, newValue);
      this.eGrade.textContent = newValue?.replace("-","–") ?? "";
    }

    get winrate() {return this._winrate;}
    set winrate(newValue) {
      this._winrate = newValue;
      this.eWinrate.textContent = newValue ? (newValue.toFixed(2) + "%") : "";
    }
  }


  class SubOverlay {
    constructor(section, grade, colors) {
      this.box = GM_addElement(section, "span", {class: "S17L-overlay S17L-overlay-sub"});
      this.manabox = GM_addElement(this.box, "span", {class: "S17L-item-mana"});
      this.gradebox = GM_addElement(this.box, "span", {class: "S17L-item-grade"});
      this.grade = grade;
      this.colors = colors;
    }

    get grade() {return this._grade;}
    set grade(newValue) {
      let oldValue = this._grade;
      this._grade = newValue;
      changeGradeStyle(this.gradebox, oldValue, newValue);
      this.gradebox.textContent = newValue.replace("-","–").padEnd(2," "); //Figure space
    }

    get colors() {return this._colors;}
    set colors(newValue) {
      this._colors = newValue;
      this.manabox.replaceChildren([]);
      for (let char of newValue) {addManaSymbol(this.manabox, char);}
    }
  }


  function changeGradeStyle(elem, oldValue, newValue) {
    if(oldValue) {elem.classList.remove("S17L-grade-"+oldValue);}
    if(newValue) {elem.classList.add("S17L-grade-"+newValue);}
  }


  function addManaSymbol(parent, color) {
    color = color.toUpperCase();
    GM_addElement(parent, "abbr", {
      class: "card-symbol card-symbol-"+color,
      textContent: "{"+color+"}"
    });
  }


  function performGrading(ctrl) {
    let card = ctrl.card;
    let cardcode = ctrl.cardcode;

    ctrl.subRegion = GM_addElement(card, "span", {class: "S17L-region-sub"});
    ctrl.main = null;
    ctrl.allSubs = {};
    let cardStatsPerDeck = allCardStats[cardcode];
    for(let [deck,stats] of Object.entries(cardStatsPerDeck ?? [])) {
      if (deck=="all") {continue;}
      if (stats.pp < 50) {continue;}
      let maj = new SubOverlay(ctrl.subRegion, "Maj.", deck);
      ctrl.allSubs["maj"] = maj;
      maj.box.classList.add("S17L-overlay-maj");
    }
    for(let [deck,stats] of Object.entries(cardStatsPerDeck ?? [])) {
      if (deck=="all") {
        ctrl.main = new MainOverlay(card, stats.g, stats.wr);
      } else if (stats.g!=cardStatsPerDeck["all"].g && (stats.sig>=1.5 || stats.pp>=50)) {
        ctrl.allSubs[deck] = new SubOverlay(ctrl.subRegion, stats.g, deck);
      }
    }
    ctrl.gridelem?.setAttribute("S17L-graded", !!cardStatsPerDeck);
  }


  function sortGrid(grid, sorter) {
    let direction = (document.querySelector("option[value='asc']")?.getAttribute("selected")=="selected") ? -1 : 1;
    [...grid.children]
      .sort((a, b) => {
        if (a.className.includes("flexbox-spacer")) {return 1;}
        if (b.className.includes("flexbox-spacer")) {return -1;}
        if (a.getAttribute("S17L-graded")!="true") {return 1;}
        if (b.getAttribute("S17L-graded")!="true") {return -1;}
        let cardA = a.getAttribute("S17L-cardcode");
        let cardB = b.getAttribute("S17L-cardcode");
        return direction * sorter(cardA, cardB);
      })
      .forEach(node => grid.appendChild(node));
  }
  function sortByGrade(cardA,cardB) {
    return (allCardStats[cardB]?.all?.wr??0) - (allCardStats[cardA]?.all?.wr??0);
  }


  function performSort() {
    if (document.querySelector("option[value='grid']")?.getAttribute("selected")=="selected") {
      document.querySelector("option[value='artist']").textContent = "17Lands Rank";
    }
    let orderPanel = document.querySelector("#order[type='hidden']");
    if (orderPanel?.getAttribute("value")=="artist") {
      document.querySelectorAll(".card-grid-inner").forEach(function(grid){
        sortGrid(grid, sortByGrade);
      });
    }
  }





  return {
    performGrading: performGrading,
    performSort: performSort
  };
};


//TAGS


const _TAGS = function(){


  GM_addStyle(`

    . {
      --S17L-tag-vis: visible;
      --S17L-sb-vis: visible;
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

    .S17L-overlay-tag {
      border-radius: 10px;
      min-width: 50px;
      white-space: nowrap;

      padding: 6px;
      font-size: 12px;
      background: #000000;
      color: white;
      border: solid 2px lightgray;
      cursor: help;
      visibility: var(--S17L-tag-vis);
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
      overflow-y: scroll;
      overflow-x: clip;

      display: flex;
      flex-flow: column nowrap;
      flex: 1 1;
      align-items: flex-start;
      row-gap: 2px;
      visibility: var(--S17L-sb-vis);
    }
    .S17L-overlay-tag-sidebar {
      font-size: 12px;
      min-width: 40px;
      visibility: inherit;
    }

    .S17L-tag-color-W {color: lemonchiffon; border-color: tan; background: #000000;}
    .S17L-tag-color-U {color: lightcyan; border-color: dodgerblue; background: #000000;}
    .S17L-tag-color-B {color: thistle; border-color: darkmagenta; background: #000000;}
    .S17L-tag-color-R {color: pink; border-color: brown; background: #000000;}
    .S17L-tag-color-G {color: #D0FFD0; border-color: darkgreen; background: #000000;}
    .S17L-tag-color-C {color: gainsboro; border-color: gray; background: #000000;}
    .S17L-tag-color-A {color: gainsboro; border-color: gray; background: #000000;}
    .S17L-tag-color-X {color: bisque; border-color: goldenrod; background: #000000;}
    .S17L-tag-cat-removal {background: radial-gradient(circle at left, #990000 0px, #480000 15px, black 15px);}
    .S17L-tag-cat-semiremoval {background: radial-gradient(circle at left, #996600 0px, #3A3300 15px, black 15px);}
  `);


  let rsTemplates = JSON.parse(GM_getResourceText("resTemplates"));
  if (!GM_getValue("S17L-temptags")) {
    GM_setValue("S17L-temptags", {});
  }
  let allTagDefinitions = {...rsTemplates.templateDefinitions, ...localTagDefinitions};
  let allTagListings = {...rsTemplates.templateListing, ...localTagListing, ...GM_getValue("S17L-temptags")};
  let fixedTagListings = {...rsTemplates.templateListing, ...localTagListing}; //without temptags


  function addTag(box, cardcode, tagcode) {
    let myData = allTagDefinitions[tagcode];
    if (!myData) {return;}
    let elem = GM_addElement(box, "a", {
      class: "S17L-overlay S17L-overlay-tag S17L-tag-color-" + (myData.color??"X") + " S17L-tag-cat-" + (myData.category??""),
      href: myData.url,
      textContent: myData.display ?? tagcode,
      title: myData.help ?? "",
      draggable: ALLOW_TAGGING,
      "S17L-cardcode": cardcode,
      "S17L-tagcode": tagcode,
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
    if(!ALLOW_TAGGING) {return;}
    ev.preventDefault();
    if (ev.dataTransfer.getData("type")!="S17L-tag") {return;}

    let {cardcodesrc, tagcode} = JSON.parse(ev.dataTransfer.getData("values"));
    let cardcodetarget = card.getAttribute("S17L-cardcode");
    let region = card.querySelector(".S17L-region-tag");
    if (cardcodesrc==cardcodetarget || !region) {return;}

    let newTag = addTag(region, cardcodetarget, tagcode);
    newTag.setAttribute("S17L-cuttable", true);
    pushTempTags(cardcodetarget, tagcode);
  }


  function pushTempTags(cardcode, tagcode) {
    let allTempTags = GM_getValue("S17L-temptags");
    var value;
    if(allTempTags[cardcode]) {
      value = allTempTags[cardcode] + " " + tagcode;
    } else {
      value = tagcode;
    }
    allTempTags[cardcode] = value;
    GM_setValue("S17L-temptags", allTempTags);
  }


  function performTag(ctrl) {
    if (!SHOW_TAGS) {return;}
    let card = ctrl.card;
    let cardcode = ctrl.cardcode;

    card.addEventListener("dragover", (ev)=>{ev.preventDefault()});
    card.addEventListener("drop", (ev)=>{onDropTag(ev,card)});
    ctrl.tagRegion = GM_addElement(card, "span", {class: "S17L-region-tag"});

    ctrl.allTags = {};
    let tagsOfCard = allTagListings[cardcode];
    if (tagsOfCard) {
      for(let tagcode of tagsOfCard.split(' ')) {
        ctrl.allTags[tagcode] = addTag(ctrl.tagRegion, cardcode, tagcode);
      }
    }
  }


  function addExportButton(elem) {
    let button = GM_addElement(elem, "button", {
      class: "button-n",
      textContent: "✂ Cut Tags"
    });
    button.addEventListener("click", function(ev){
      let allTempTags = GM_getValue("S17L-temptags");
      let outputTags = {};
      for(let [name,toAdd] of Object.entries(allTempTags)) {
        if (fixedTagListings[name]) {
          outputTags[name] = fixedTagListings[name] + " " + toAdd;
        } else {
          outputTags[name] = toAdd;
        }
      }
      console.log(outputTags);
      GM_setClipboard(JSON.stringify(outputTags, null, 2).replace(/ *\{/,"").replace(/\n *\}/,",") );
      GM_setValue("S17L-temptags",{});
      document.querySelectorAll("[S17L-cuttable=true]").forEach((elem)=>elem.remove())
    });
  }


  function addTagSidebar() {
    let sidebar = GM_addElement(document.body, "aside", {
      class: "S17L-container-sidebar",
    });
    let allTagCodes = Object.keys(allTagDefinitions);
    ////function key(name){return "WUBRGAX".indexOf(allTagDefinitions[name].color??"X") + allTagDefinitions[name].display}
    ////allTagCodes.sort((a,b)=>key(a).localeCompare(key(b)));
    for (let tagcode of allTagCodes) {
      let tag = addTag(sidebar, "none", tagcode, true);
      tag.classList.add("S17L-overlay-tag-sidebar");
    }
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
  let allManagers = {};


  class CardController {
    constructor(card, cardcode, gridelem) {
      this.card = card;
      this.cardcode = cardcode;
      this.gridelem = gridelem;
      card.setAttribute("S17L-cardcode", cardcode);
      STATS.performGrading(this);
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


  let header = document.querySelector("#header");
  let h = GM_addElement("div", {class: "header"});
  header.parentNode.insertBefore(h, header.nextSibling);
  let hcr = GM_addElement(h, "div", {class: "header-control-row", id: "S17L-header"});
  function addCheckbox(parent, label, prop, o1, o2) {
    let asc = GM_addElement(parent, "label", {class: "advanced-search-checkbox"});
    let initChecked = GM_getValue(prop) ?? true;
    console.log(prop, initChecked);
    let cb = GM_addElement(asc, "input", {type: "checkbox", style: "margin: 0px"});
    let lb = GM_addElement(asc, "span", {class: "header-link", textContent: label});
    cb.checked = initChecked;
    if(prop) {
      document.documentElement.style.setProperty(prop, initChecked?o1:o2);
      cb.addEventListener('change', (ev)=>{
        let checked = ev.target.checked;
        GM_setValue(prop, checked);
        document.documentElement.style.setProperty(prop, checked?o1:o2);
      });
    }
    return cb;
  }
  addCheckbox(hcr, "Grade", "--S17L-grade-vis", "visible", "initial");
  addCheckbox(hcr, "Winrate", "--S17L-wr-vis", "visible", "initial");
  addCheckbox(hcr, "Subgrades", "--S17L-sub-disp", "flex", "none");
  addCheckbox(hcr, "Deck Majority", "--S17L-maj-disp", "flex", "none");
  addCheckbox(hcr, "Draft Tags", "--S17L-tag-vis", "visible", "hidden");
  addCheckbox(hcr, "Sidebar", "--S17L-sb-vis", "visible", "hidden");


  STATS.performSort();
  TAGS.performTagControls();
};


localTagListing = {
  //"fra/1": "ex"
}

//category: body|removal|semiremoval|resource|trick
localTagDefinitions = {
  /*
  "ex": {
    "display": "Example",
    "color": "U",
    "category": "body",
    "query": "is:permanent (st:expansion r<r)",
    "url": "https://scryfall.com/search?q=is%3Apermanent+%28st%3Aexpansion+r%3Cr%29&unique=cards&as=grid&order=released",
    "help": "Help text",
  },
  */
}

const STATS=_STATS();
const TAGS=_TAGS();
main();

