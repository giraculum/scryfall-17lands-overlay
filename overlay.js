// ==UserScript==
// @name        Scryfall 17Lands Overlay
// @namespace   Violentmonkey Scripts
// @icon
// @version     0.2.0
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
const SHOW_TEMPLATES = true; //displayed at bottom of card if present
const SHOW_SIDEBAR = false; //sidebar of all current templates, for easy editing

const ALLOW_TEMPLATE_EDITS = true;/*
drag and drop templates from anywhere onto cards, then choose Cut to Clipboard on top right
paste into localTemplateListing at the bottom for persistence
templates are separated by spaces if multiple are on the same printing
*/

function main(){
  let rsTemplates = JSON.parse(GM_getResourceText("resTemplates"));

  let allCardStats = JSON.parse(GM_getResourceText("resCardStats"));
  let allTemplateDefinitions = {...rsTemplates.templateDefinitions, ...localTemplateDefinitions};
  let allTemplateListings = {...rsTemplates.templateListing, ...localTemplateListing, ...GM_getValue("S17L-mytemplates")};
  let fixedTemplateListings = {...rsTemplates.templateListing, ...localTemplateListing}; //without mytemplates
  let allManagers = {};


  function addPrimaryOverlay(card, stats) {
    let grade = stats?.g;
    if (!grade) {return;}
    let primaryOverlay = GM_addElement(card, "span", {
      class: "S17L-overlay S17L-overlay-primary S17L-grade-"+grade,
      textContent: grade.replace("-","–")
    });
    if (SHOW_WINRATES) {
      GM_addElement(primaryOverlay, "span", {
        class: "S17L-info-winrate S17L-grade-"+grade,
        textContent: stats.wr.toFixed(2) + "%"
      });
    }
    return primaryOverlay;
  }


  function addSecondaryOverlay(box, stats, label) {
    let grade = stats?.g;
    if (!grade || !label) {return;}
    let myBox = GM_addElement(box, "span", {
      class: "S17L-overlay S17L-overlay-secondary"
    });
    let manabox = GM_addElement(myBox, "span", {
      class: "S17L-item-mana"
    });
    for (let i=0; i<label.length; i++) {
      addManaSymbol(manabox, label.charAt(i));
    }
    let displayGrade = grade.replace("-","–");
    if (displayGrade.length==1) {
      displayGrade=displayGrade+" "; //Figure space
    }
    GM_addElement(myBox, "span", {
      class: "S17L-item-grade S17L-grade-"+grade,
      textContent: displayGrade
    });
    return myBox;
  }


  function addManaSymbol(parent, color) {
    color = color.toUpperCase();
    GM_addElement(parent, "abbr", {
      class: "card-symbol card-symbol-"+color,
      textContent: "{"+color+"}"
    });
  }


  function addTemplateOverlay(box, cardcode, template) {
    let myData = allTemplateDefinitions[template];
    if (!myData) {return;}
    let params = {
      class: "S17L-overlay S17L-overlay-template S17L-template-" + (myData.color??"X") + " S17L-template-cat-" + (myData.category??""),
      href: myData.url ?? "",
      textContent: myData.display ?? template,
      title: myData.help ?? "",
      draggable: ALLOW_TEMPLATE_EDITS,
      "S17L-cardcode": cardcode,
      "S17L-templatecode": template,
    };
    let templateLink = GM_addElement(box, "a", params);
    templateLink.addEventListener("dragstart", (event)=>{onDragTemplate(event,cardcode,template)});
    return templateLink;
  }


  function onDragTemplate(ev, cardcode, template) {
    console.log("dragging "+template+" from "+cardcode);
    ev.dataTransfer.setData("type", "S17L-template");
    ev.dataTransfer.setData("values", JSON.stringify({cardcode:cardcode, template:template}))
  }


  function onDropTemplate(ev, card) {
    if(!ALLOW_TEMPLATE_EDITS) {return;}
    ev.preventDefault();
    let values = JSON.parse(ev.dataTransfer.getData("values"));
    let cardcodesrc = values.cardcode;
    let template = values.template;
    let cardcodetarget = card.getAttribute("S17L-cardcode");
    console.log(cardcodesrc,cardcodetarget);
    if (cardcodesrc == cardcodetarget) {
      return;
    }
    let box = card.querySelector(".S17L-container-template");
    if (!box) {return;}
    let overlay = addTemplateOverlay(box, cardcodetarget, template);
    overlay.setAttribute("S17L-cuttable", true);
    let myTemplates = GM_getValue("S17L-mytemplates",{});
    var output = "";
    if(myTemplates[cardcodetarget]) {
      output = myTemplates[cardcodetarget] + " " + template;
    } else {
      output = template;
    }
    myTemplates[cardcodetarget] = output;
    GM_setValue("S17L-mytemplates", myTemplates);
  }


  function addOverlays(card, cardcode) {
    let manager = {
      "key": cardcode,
      "base": card,
      "prmaryOverlay": null,
      "secondaryContainer": null,
      "secondaryOverlays": {},
      "templates": {},
    };
    allManagers[cardcode] = manager;
    card.setAttribute("S17L-cardcode", cardcode);

    manager.templateBox = GM_addElement(card, "span", {
      class: "S17L-container-template"
    }); //create even with no templates, for drag-and-drop
    card.addEventListener("dragover", (ev)=>{ev.preventDefault()});
    card.addEventListener("drop", (ev)=>{onDropTemplate(ev,card)});

    let cardTemplates = allTemplateListings[cardcode];
    if (SHOW_TEMPLATES && cardTemplates) {
      for(let template of cardTemplates.split(' ')) {
        manager.templates[template] = addTemplateOverlay(manager.templateBox, cardcode, template);
      }
    }

    let cardStatsPerDeck = allCardStats[cardcode]
    manager.secondaryContainer = GM_addElement(card, "span", {
      class: "S17L-container-secondary"
    });
    for(let [deck,stats] of Object.entries(cardStatsPerDeck ?? [])) {
      if (deck=="all") {
        manager.prinmaryOverlay = addPrimaryOverlay(card, stats);
      } else {
        //if (Math.abs(stats.sig)>=2 && stats.g!=cardStatsPerDeck["all"].g) {
        if (stats.pp >= 50 || (stats.sig>=2 && stats.g!=cardStatsPerDeck["all"].g)) {
          manager.secondaryOverlays[deck] = addSecondaryOverlay(manager.secondaryContainer, stats, deck);
        }

      }
    }
    return manager;
  }

  function getCardCode(url) {
    let match = url.match(/card\/([^\/]*\/\d*\w?)/);
    return match?.[1];
  }

  function processCardInGrid(card) {
    let cardcode = getCardCode(card.getAttribute("href"));
    if (!cardcode) {return;}
    let manager = addOverlays(card, cardcode);
    manager.griditem = card.parentElement;
    manager.griditem.setAttribute("S17L-managed", true);
    manager.griditem.setAttribute("S17L-cardcode", cardcode);
  }
  document.querySelectorAll(".card-grid-item-card").forEach(processCardInGrid);


  function processCardInPage(card) {
    let cardcode = getCardCode(document.URL);
    if (!cardcode) {return;}
    addOverlays(card, cardcode);
  }
  document.querySelectorAll(".card-image").forEach(processCardInPage);


  function addExportButton(elem) {
    let button = GM_addElement(elem, "button", {
      textContent: "Cut to Clipboard"
    });
    button.addEventListener("click", function(ev){
      let myTemplates = GM_getValue("S17L-mytemplates");
      let outputTemplates = {};
      for(let [name,toAdd] of Object.entries(myTemplates)) {
        if (fixedTemplateListings[name]) {
          outputTemplates[name] = fixedTemplateListings[name] + " " + toAdd;
        } else {
          outputTemplates[name] = toAdd;
        }
      }
      console.log(outputTemplates);
      GM_setClipboard(JSON.stringify(outputTemplates, null, 2).replace(/ *\{/,"").replace(/\n *\}/,",") );
      GM_setValue("S17L-mytemplates",{});
      document.querySelectorAll("[S17L-cuttable=true]").forEach((elem)=>elem.remove())
    });
  }
  if (ALLOW_TEMPLATE_EDITS) {
    document.querySelectorAll(".search-controls-inner").forEach(function(elem){
      addExportButton(elem);
    });
  }


  function addTemplateSidebar() {
    let myBox = GM_addElement(document.body, "aside", {
      class: "S17L-container-sidebar",
    });
    let templateNames = Object.keys(allTemplateDefinitions);
    //function key(name){return "WUBRGAX".indexOf(allTemplateDefinitions[name].color??"X") + allTemplateDefinitions[name].display}
    //templates.sort((a,b)=>key(a).localeCompare(key(b)));
    for (let name of templateNames) {
      let template = addTemplateOverlay(myBox, "none", name, true);
      template.classList.add("S17L-overlay-template-boxed");
    }
  }
  if (SHOW_TEMPLATES && SHOW_SIDEBAR) {
    addTemplateSidebar();
  }

  var direction = (document.querySelector("option[value='asc']")?.getAttribute("selected")=="selected")?-1:1;
  function sortGrid(grid, sorter) {
    [...grid.children]
      .sort((a, b) => {
        if (a.className.includes("flexbox-spacer")) {return 1;}
        if (b.className.includes("flexbox-spacer")) {return -1;}
        if (!a.getAttribute("S17L-managed")) {return -1;}
        if (!b.getAttribute("S17L-managed")) {return 1;}

        let cardA = a.getAttribute("S17L-cardcode");
        let cardB = b.getAttribute("S17L-cardcode");
        return direction * sorter(cardA,cardB);
      })
      .forEach(node => grid.appendChild(node));
  }
  function sortByGrade(cardA,cardB) {
    return (allCardStats[cardB]?.all?.wr??0) - (allCardStats[cardA]?.all?.wr??0);
  }
  let orderPanel = document.querySelector("#order[type='hidden']");
  if (orderPanel?.getAttribute("value")=="artist") {
    document.querySelectorAll(".card-grid-inner").forEach(function(grid){
      sortGrid(grid, sortByGrade);
    });
  }
  if (document.querySelector("option[value='grid']")?.getAttribute("selected")=="selected") {
    document.querySelector("option[value='artist']").textContent = "17Lands Rank";
  }


  GM_addStyle(`
    .S17L-overlay {
      z-index: 10;
      background: rgb(0,0,0,0.8);

      text-align: center;
      font-weight: bolder;
      color: white;
    }

    .S17L-overlay-primary {
      position: absolute;
      left: 7.5%;
      top: 11.1%;
      width: 86px;
      height: 66px;
      border-bottom-right-radius: 26px;

      padding-top: 6px;
      padding-right: 3px;
      font-size: 48px;
      text-shadow: 3px 3px #222222;
    }

    .S17L-info-winrate {
      position: absolute;
      /*left: 15%; top: 26%;*/
      left: 0; right: 0; bottom: 0;
      font-size: 12px;
      z-index: 11;
    }

    .S17L-container-secondary {
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

    .S17L-overlay-secondary {
      left: 0%;
      top: 0%;
      width: 86px;
      height: 20px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      background: rgb(0,0,0,0.9);

      font-size: 16px;
      display: flex;
      flex-flow: row nowrap;
      justify-content: space-between;
      align-items: center;
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

    .S17L-container-template {
      position:absolute;
      bottom: -2%;
      left: 0%
      height: 12%;
      width: 100%;

      display: flex;
      flex-flow: row wrap;
      justify-content: center;
      align-items: center;
      flex: 1 1;
      column-gap: 2px;
    }

    .S17L-overlay-template {
      /*position:absolute;*/
      /*left: calc(7.5% + 86px + 4px);
      top: calc(11.1% + 15px);*/
      /*top: 11.1%;*/
      /*bottom: -2%;
      left: 50%;
      transform: translate(-50%, 0);*/
      border-radius: 10px;
      min-width: 80px;

      padding: 6px;
      font-size: 16px;
      background: #000000;
      color: white;
      border: solid 2px lightgray;
      cursor: help;
    }
    .S17L-template-W {color: lemonchiffon; border-color: tan; background: #000000;}
    .S17L-template-U {color: lightcyan; border-color: dodgerblue; background: #000000;}
    .S17L-template-B {color: thistle; border-color: darkmagenta; background: #000000;}
    .S17L-template-R {color: pink; border-color: brown; background: #000000;}
    .S17L-template-G {color: #D0FFD0; border-color: darkgreen; background: #000000;}
    .S17L-template-A {color: gainsboro; border-color: gray; background: #000000;}
    .S17L-template-X {color: bisque; border-color: goldenrod; background: #000000;}
    /*.S17L-template-cat-removal {background: linear-gradient(to right, #990000 0%, black 15%, black 85%, #990000 100%);}*/
    .S17L-template-cat-removal {background: radial-gradient(circle at left, #990000 0px, #480000 15px, black 15px);}
    .S17L-template-cat-semiremoval {background: radial-gradient(circle at left, #996600 0px, #3A3300 15px, black 15px);}

    .S17L-container-sidebar {
      position: fixed;
      width: 400px;
      height: 100%;
      bottom: 0;
      left: 0;
      border: 5px solid #999;

      display: flex;
      flex-flow: column wrap;
      flex: 1 1;
      align-items: flex-start;
      row-gap: 2px;
    }
    .S17L-overlay-template-boxed {
      font-size: 12px;
      min-width: 40px;
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
  `);
};

localTemplateListing = {
  "sos/11": "thopterist",
  "dft/53": "thopterist",
}


localTemplateDefinitions = {
  "thopterist": {
    "display": "Thopterist",
    "color": "X",
    "query": "o:enters o:create o:flying t:creature (st:expansion) date>2021",
    "url": "https://scryfall.com/search?q=o%3Aenters+o%3Acreate+o%3Aflying+t%3Acreature+%28st%3Aexpansion%29+date%3E2021&unique=cards&as=grid&order=artist",
    "help": "Creature that creates a flying token on enter",
  },
}


main();
