// ==UserScript==
// @name        Scryfall 17Lands Overlay
// @namespace   Violentmonkey Scripts
// @icon
// @version     0.1.0
//
// @match       *://scryfall.com/*
// @grant       GM_addStyle
// @grant       GM_addElement
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_setClipboard
// @grant       GM_getResourceText
//
// @resource    resGrades https://giraculum.github.io/grades.json
// @author      Giraculum
// @description Overlays rankings from 17Lands data onto Scryfall searches
// ==/UserScript==


const SHOW_TEMPLATES = true;
const ALLOW_TEMPLATE_EDITS = false;


function main(){
  let allGrades = JSON.parse(GM_getResourceText("resGrades"));
  let allTemplates = {...knownTemplates, ...GM_getValue("S17L-mytemplates")};


  function addPrimaryOverlay(card, grade) {
    if (!grade) {return;}
    GM_addElement(card, "span", {
      class: "S17L-overlay S17L-overlay-primary S17L-grade-"+grade,
      textContent: grade.replace("-","–")
    });
  }


  function addSecondaryOverlay(box, grade, label) {
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
  }


  function addManaSymbol(parent, color) {
    color = color.toUpperCase();
    GM_addElement(parent, "abbr", {
      class: "card-symbol card-symbol-"+color,
      textContent: "{"+color+"}"
    });
  }


  function addTemplateOverlay(box, cardcode, template) {
    let myData = templateDefinitions[template];
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
    if (myData.url) {
      params.href = myData.url;
    }
    let templateLink = GM_addElement(box, "a", params);
    templateLink.addEventListener("dragstart", (event)=>{onDragTemplate(event,cardcode,template)});
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
    addTemplateOverlay(box, cardcodetarget, template);
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


  function addOverlays(card, url) {
    let match = url.match(/card\/([^\/]*\/\d*\w?)/);
    if (!match) {return;}
    let cardcode = match[1];
    card.setAttribute("S17L-cardcode", cardcode);

    let templateBox = GM_addElement(card, "span", {
      class: "S17L-container-template"
    }); //create even with no templates, for drag-and-drop
    card.addEventListener("dragover", (ev)=>{ev.preventDefault()});
    card.addEventListener("drop", (ev)=>{onDropTemplate(ev,card)});

    let cardTemplates = allTemplates[cardcode];
    if (SHOW_TEMPLATES && cardTemplates) {
      for(let template of cardTemplates.split(' ')) {
        addTemplateOverlay(templateBox, cardcode, template);
      }
    }

    let cardGrades = allGrades[cardcode]
    if (!cardGrades) {return;}
    let box = GM_addElement(card, "span", {
      class: "S17L-container-secondary"
    });
    for(let [deck,grade] of Object.entries(cardGrades)) {
      if (deck=="all") {
        addPrimaryOverlay(card, grade);
      } else {
        addSecondaryOverlay(box, grade, deck);
      }
    }
  }

  function processCardInGrid(card) {
    let url = card.getAttribute("href");
    addOverlays(card, url);
  }
  document.querySelectorAll(".card-grid-item-card").forEach(processCardInGrid);


  function processCardInPage(card) {
    let url = document.URL;
    addOverlays(card,url)
  }
  document.querySelectorAll(".card-image").forEach(processCardInPage);


  function addExportButton(elem) {
    let button = GM_addElement(elem, "button", {
      textContent: "Export templates"
    });
    button.addEventListener("click", function(ev){
      let myTemplates = GM_getValue("S17L-mytemplates");
      let outputTemplates = {};
      for(let [name,toAdd] of Object.entries(myTemplates)) {
        if (knownTemplates[name]) {
          outputTemplates[name] = knownTemplates[name] + " " + toAdd;
        } else {
          outputTemplates[name] = toAdd;
        }
      }
      console.log(outputTemplates);
      GM_setClipboard(JSON.stringify(outputTemplates, null, 2).replace(/ *\{/,"").replace(/\n *\}/,",") );
      GM_setValue("S17L-mytemplates",{});
    });
  }
  document.querySelectorAll(".search-controls-inner").forEach(function(elem){
    addExportButton(elem);
  });

  function addTagger() {
    let myBox = GM_addElement(document.body, "aside", {
      class: "S17L-container-sidebar",
    });
    let templateNames = Object.keys(templateDefinitions);
    //function key(name){return "WUBRGAX".indexOf(templateDefinitions[name].color??"X") + templateDefinitions[name].display}
    //templates.sort((a,b)=>key(a).localeCompare(key(b)));
    for (let name of templateNames) {
      addTemplateOverlay(myBox, "none", name);
    }
  }
  if (SHOW_TEMPLATES) {
    addTagger();
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
    .S17L-template-X {color: bisque; border-color: burlywood; background: #000000;}
    /*.S17L-template-cat-removal {background: linear-gradient(to right, #990000 0%, black 15%, black 85%, #990000 100%);}*/
    .S17L-template-cat-removal {background: radial-gradient(circle at left, #990000 0px, #480000 15px, black 15px);}
    .S17L-template-cat-semiremoval {background: radial-gradient(circle at left, #996600 0px, #3A3300 15px, black 15px);}

    .S17L-container-sidebar {
      position: fixed;
      width: 400px;
      height: calc(100% - 52px);
      bottom: 0;
      left: 0;
      border: 5px solid #999;

      display: flex;
      flex-flow: column wrap;
      flex: 1 1;
      align-items: flex-start;
      row-gap: 2px;
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


templateUrlExtra = "+(st%3Aexpansion)+sort%3Adate&unique=cards&as=grid&order=released"

knownTemplates = {
  "sos/66": "tuck",
  "dft/71": "tuck",
  "trk/60": "tuck",
  "ecl/78": "tuck",
  "neo/69": "manarock tuck",
  "fra/35": "tuck",
  "lci/82": "tuck",
  "woe/61": "tuck",
  "bro/46": "tuck",
  "snc/58": "tuck",
  "mkm/72": "tuck",
  "otj/53": "tuck",
  "blb/46": "tuck",
  "dsk/82": "tuck",
  "eoe/62": "tuck",
  "fin/56": "tuck",
  "tdm/54": "tuck",
  "ecl/75": "tuck",
  "tla/62": "tuck",
  "hob/58": "tuck",
  "msh/81": "tuck",
  "tmt/52": "tuck",
  "fra/126": "tuck",

  "ecl/24": "o-ring",
  "fra/157": "draw2",
  "sos/18": "swap",
  "sos/65": "draw2",
  "sos/77": "signinblood",
  "sos/86": "stab",
  "sos/11": "thopterist",
  "sos/155": "manadork",
  "hob/121": "dreadmaw",

  "fra/15": "o-ring",
  "fra/31": "lockdown",
  "fra/33": "cantripper",

  "fra/45": "bigbird",
  "tmt/54": "bigbird",
  "ecl/72": "bigbird",
  "eoe/77": "bigbird",
  "blb/71": "bigbird",
  "otj/43": "bigbird",
  "woe/63": "bigbird",
  "mom/81": "bigbird",
  "one/66": "bigbird",
  "bro/55": "bigbird",
  "dft/47": "bigbird",
  "tdm/40": "bigbird",
  "tla/52": "bigbird",


  "fra/46": "bounce",
  "ecl/67": "bounce",
  "sos/38": "bounce",
  "tla/46": "bounce",
  "fra/132": "bounce",
  "spm/48": "bounce",
  "eoe/54": "bounce",
  "fin/56": "bounce",
  "fin/52": "bounce",
  "tdm/63": "bounce",
  "dft/58": "bounce",
  "dft/39": "bounce",
  "blb/52": "bounce",
  "dsk/80": "bounce",
  "otj/47": "bounce",
  "mkm/74": "bounce",
  "lci/46": "bounce",
  "woe/58": "bounce",
  "bro/57": "bounce",
  "one/68": "bounce",
  "mom/55": "bounce",
  "dmu/71": "bounce",
  "dmu/63": "bounce tuck",
  "snc/52": "bounce",
  "blb/67": "bounce",

  "fra/51": "signinblood",
  "fra/56": "stab",
  "trk/105": "stab",
  "fra/155": "stab",
  "hob/69": "stab",
  "msh/93": "stab",
  "msh/122": "stab",
  "tmt/82": "stab",
  "ecl/89": "stab",
  "ecl/85": "stab",
  "spm/65": "stab",
  "eoe/122": "stab",
  "eoe/96": "stab",
  "fin/124": "stab",
  "dft/108": "stab",
  "tdm/74": "stab",
  "dft/88": "stab",
  "dft/95": "stab",
  "blb/109": "stab",
  "otj/85": "stab",
  "mkm/106": "stab",
  "lci/110": "stab",
  "woe/227": "stab",
  "woe/103": "stab",
  "woe/90": "stab",
  "woe/83": "stab",
  "mom/104": "stab",
  "mom/95": "stab",
  "one/91": "stab",
  "one/117": "stab",
  "bro/91": "stab",
  "dmu/113": "stab",
  "snc/99": "stab",
  "snc/74": "stab",
  "neo/107": "stab",

  "sos/95": "salvage",
  "msh/94": "salvage",
  "ecl/123": "salvage",
  "fin/100": "salvage",
  "blb/97": "salvage",
  //"tdm/98": "salvage",
  "mkm/93": "salvage",
  "woe/80": "salvage",
  "snc/92": "salvage",


  "fra/61": "rats",
  "fra/67": "thoughtseize",
  "fra/104": "manadork",

  "ecl/45": "lockdown",
  "msh/54": "lockdown",
  "trk/72": "lockdown",
  "hob/39": "lockdown",
  "tla/82": "lockdown",
  "tdm/53": "lockdown",
  "fin/74": "lockdown",
  "fin/76": "lockdown",
  "eoe/82": "lockdown",
  "dft/42": "lockdown",
  "dsk/74": "lockdown",
  "otj/72": "lockdown",
  "one/62": "lockdown",
  "woe/44": "lockdown",
  "mkm/53": "lockdown",
  "neo/83": "lockdown",
  "snc/61": "lockdown",
  "bro/72": "lockdown",

  "fra/61": "rats",
  "fra/237": "rats",
  "hob/85": "rats",
  "tla/92": "rats",
  "ecl/101": "rats",
  "eoe/124": "rats",
  "fin/103": "rats",
  "dsk/96": "rats",
  "mom/120": "rats",
  "blb/118": "rats",

  "hob/7": "o-ring",
  "msh/41": "o-ring",
  "eoe/34": "o-ring",
  "msh/37": "o-ring",
  "tmt/4": "o-ring",
  "eoe/6": "o-ring",
  "fin/41": "o-ring",
  "tdm/28": "o-ring",
  "tdm/26": "o-ring",
  "dsk/36": "o-ring",
  "otj/18": "o-ring",
  "trk/22": "o-ring",
  "fin/41": "o-ring manarock",
  "mkm/23": "o-ring",
  "lci/10": "o-ring",
  "woe/16": "o-ring",
  "mom/35": "o-ring",
  "one/26": "o-ring",
  "dmu/28": "o-ring",
  "bro/27": "o-ring",
  "dmu/11": "o-ring",
  "neo/40": "o-ring",
  "mkm/191": "o-ring",
  "otj/19": "o-ring",
  "tla/16": "banisher",
  "eoe/3": "banisher",
  "dsk/9": "angel banisher",
  "one/2": "banisher",
  "mom/3": "banisher",
  "blb/11": "banisher",

  "fra/114": "mulch",
  "trk/199": "mulch",
  "msh/181": "mulch",
  "sos/148": "mulch",
  "tmt/113": "mulch",
  "ecl/182": "mulch",
  "spm/113": "mulch",
  "fin/182": "mulch",
  "dft/159": "mulch",
  "tla/195": "mulch",
  "lci/192": "mulch",
  "mom/204": "mulch",
  "woe/166": "mulch",
  "bro/196": "mulch",
  "snc/164": "mulch",
  "neo/180": "mulch",
  "sos/169": "mulch",
  "spm/109": "mulch",
  "dsk/181": "mulch",
  "blb/167": "mulch",

  "fra/22": "giantkiller",
  "hob/27": "giantkiller",
  "msh/24": "giantkiller",
  "sos/34": "giantkiller",
  "tmt/20": "giantkiller",
  "ecl/30": "giantkiller",
  //"tla/34": "giantkiller",
  "fin/9": "giantkiller",
  "spm/15": "giantkiller",
  //"tla/15": "giantkiller",
  "dft/13": "giantkiller",
  "tdm/19": "giantkiller",
  "dsk/8": "disenchant giantkiller",
  "blb/27": "giantkiller",
  "neo/33": "giantkiller",
  "dmu/17": "giantkiller",
  "woe/20": "giantkiller",
  "otj/14": "giantkiller",
  "neo/12": "giantkiller",
  "trk/8": "giantkiller",

  "tdm/241": "manarock",
  "tdm/140": "manarock",
  "dft/244": "manarock",
  "fin/254": "manarock",
  "eoe/234": "manarock",
  "ecl/260": "manarock",
  "ecl/255": "manarock",
  "tla/255": "manarock",
  "spm/164": "manarock",
  "sos/132": "manarock",
  "sos/251": "manarock",
  "fra/174": "manarock",
  "fin/269": "manarock",
  "dsk/250": "manarock",
  "blb/247": "manarock",
  "otj/240": "manarock",
  "mkm/255": "manarock",
  "lci/262": "manarock",
  "one/237": "manarock",
  "dmu/236": "manarock",
  "dmu/235": "manarock",
  "neo/251": "manarock",
  //"neo/69": "manarock",
  "vow/257": "manarock",
  "snc/107": "manarock",

  "fra/37": "draw3",
  "spm/42": "draw3 cancel",
  "hob/51": "draw3",
  "eoe/48": "draw3",
  "tdm/38": "draw3",
  "otj/62": "draw3",
  "woe/312": "draw3",
  "woe/57": "draw3",
  "one/77": "draw3",
  "fin/82": "draw3",

  "tmt/39": "draw2",
  "fin/48": "draw2",
  "dft/67": "draw2",
  "dsk/62": "draw2",
  "blb/64": "draw2",
  "blb/72": "cancel draw2",
  "otj/64": "draw2",
  "lci/48": "draw2",
  "mom/66": "draw2",
  "one/46": "draw2",
  "snc/37": "draw2",
  "neo/64": "draw2",

  "lci/50": "dig manaleak",
  "lci/68": "dig",
  "woe/67": "dig",
  "one/49": "dig",
  "dmu/55": "dig",
  "mom/67": "dig",
  "sos/49": "dig",
  "tla/44": "dig",
  "snc/47": "dig",
  "neo/50": "dig",

  "tmt/53": "draw2",
  "tla/80": "draw3",
  "eoe/52": "draw2",
  "blb/59": "draw3",
  "mkm/52": "draw2",

  "sos/53": "wipeout",
  "ecl/83": "wipeout",
  "msh/46": "wipeout",
  "blb/43": "wipeout",
  "otj/74": "wipeout",
  "mkm/66": "wipeout",

  "dmu/83": "splinter",
  "tla/95": "splinter",
  "fra/66": "splinter",
  "hob/84": "splinter",
  "ecl/94": "splinter",
  "blb/94": "splinter",
  "one/80": "splinter",

  "msh/57": "bluedork",
  "sos/54": "bluedork",
  "tla/65": "bluedork",
  "eoe/80": "bluedork",
  "dft/45": "bluedork",
  "dsk/46": "bluedork",
  "mom/70": "bluedork",
  "lci/66": "bluedork",
  "dmu/77": "bluedork",

  "fra/262": "manafork",
  "sos/165": "manafork",
  "hob/143": "manafork",
  "ecl/180": "manafork",
  "tmt/123": "manafork",
  "tla/190": "manafork",
  "tdm/152": "manafork",
  "otj/169": "manafork",
  "dsk/193": "manafork",
  "mom/196": "manafork",
  "bro/198": "manafork",
  "neo/203": "manafork",
  "msh/164": "manafork",

  "trk/224": "manadork",
  "msh/194": "manadork",
  "tmt/114": "manadork",
  "ecl/178": "manadork",
  "spm/119": "manadork",
  "spm/102": "manadork",
  "eoe/186": "manadork",
  "dft/171": "manadork",
  "fin/188": "manadork",
  "fin/208": "manadork",
  "blb/198": "manadork",
  "mkm/180": "manadork",
  "lci/207": "manadork",
  "lci/194": "manadork",
  "woe/182": "manadork",
  "one/181": "manadork",
  "mom/201": "manadork",
  "bro/175": "manadork",
  "one/158": "manadork",
  "dmu/159": "manadork",
  "snc/149": "manadork",

  "fra/101": "bite",
  "hob/135": "bite",
  "msh/135": "bite",
  "fra/102": "bite",
  "sos/141": "bite",
  "msh/180": "bite",
  "tmt/133": "bite",
  "ecl/164": "bite",
  "tla/193": "bite",
  "ecl/141": "bite",
  "tla/164": "bite",
  "spm/120": "bite",
  "eoe/177": "bite",
  "eoe/176": "bite",
  "fin/178": "bite",
  "tdm/151": "bite",
  "tdm/147": "bite",
  "dft/179": "bite",
  "dsk/191": "bite",
  "dsk/210": "bite",
  "dsk/173": "bite",
  "blb/394": "bite",
  "blb/189": "bite",
  "blb/179": "bite",
  "mkm/164": "bite",
  "otj/155": "bite",
  "otj/185": "bite",
  "mkm/154": "bite",
  "woe/171": "bite",
  "lci/190": "bite",
  "one/172": "bite",
  "mom/182": "bite",
  "mom/208": "bite",
  "dmu/155": "bite",
  "neo/202": "bite",
  "neo/207": "bite",

  "hob/138": "fight",
  "msh/168": "fight",
  "sos/142": "fight",
  "spm/141": "fight",
  "tla/174": "fight",
  "ecl/187": "fight",
  "tmt/127": "fight",
  "spm/103": "fight",
  "eoe/199": "fight",
  "fin/180": "fight",
  "dft/174": "fight",
  "blb/182": "fight",
  "lci/198": "fight",
  "woe/167": "fight",
  "mom/192": "fight",
  "one/182": "fight",
  "bro/176": "fight",
  "bro/174": "fight",
  "dmu/182": "fight",
  "snc/154": "fight",
  "fra/160": "fight",
  "trk/183": "fight",

  "neo/37": "angel",
  "snc/1": "angel",
  "one/3": "angel",
  "mom/21": "angel",
  "woe/11": "angel",
  "lci/16": "angel",
  "mkm/2": "angel",
  "otj/28": "angel",
  "blb/33": "angel",
  "tla/9": "angel",
  "sos/32": "angel",
  "msh/12": "angel",
  "hob/11": "angel",
  "fra/203": "angel",
  "tdm/232": "angel",
  "mom/36": "angel",
  "dmu/33": "angel",

  "fra/21": "marshal",
  "hob/9": "marshal",
  "tla/41": "marshal",
  "eoe/12": "marshal",
  "ecl/39": "marshal",
  "tdm/4": "marshal",
  "dft/226": "marshal",
  "blb/37": "marshal",
  "bro/3": "marshal",
  "dmu/212": "marshal",
  "dmu/10": "marshal",

  "fra/23": "pridemate",
  "msh/2": "pridemate",
  "sos/230": "pridemate",
  "tmt/145": "pridemate",
  "tla/11": "pridemate",
  "eoe/42": "pridemate",
  "fin/246": "pridemate",
  "fin/230": "pridemate",
  "tdm/18": "pridemate",
  "dft/5": "pridemate",
  "otj/24": "pridemate",
  "otj/37": "pridemate",
  "woe/310": "pridemate",
  "woe/28": "pridemate",
  "woe/201": "pridemate",
  "mkm/233": "pridemate",
  "blb/231": "pridemate",
  "sos/14": "pridemate",
  "tmt/19": "pridemate",
  "msh/13": "pridemate",
  "trk/38": "pridemate",

  "tmt/62": "imp",
  "dft/110": "imp",
  "blb/115": "imp",
  "otj/101": "imp",
  "lci/118": "imp",
  "woe/81": "imp",
  "one/86": "imp",
  "one/103": "imp",
  "blb/226": "imp",
  "otj/103": "imp",
  "tdm/77": "imp",
  "eoe/104": "imp",
  "fin/87": "imp",
  "spm/69": "imp",
  "tmt/64": "imp",
  "hob/73": "imp",
  "fra/65": "imp",
  "trk/93": "imp",
  "mom/105": "imp",
  "bro/87": "imp",
  "mkm/230": "imp",
  "mkm/203": "imp",
  "msh/123": "imp",
  "woe/89": "imp",
  "lci/102": "imp",

  "dft/107": "vamp",
  "blb/96": "vamp",
  "sos/101": "vamp",
  "msh/119": "vamp",
  "hob/66": "vamp",
  "woe/94": "vamp",
  "mkm/78": "vamp",
  "mkm/96": "vamp",
  "otj/90": "vamp",
  "eoe/101": "vamp",
  "woe/316": "vamp",

  "hob/62": "murder",
  "msh/99": "murder",
  "sos/83": "murder",
  "trk/114": "murder",
  "fra/68": "murder",
  "tmt/77": "murder",
  "tmt/57": "murder",
  "ecl/116": "murder",
  "eoe/126": "murder",
  "spm/73": "murder",
  "eoe/98": "splinter",
  "fin/116": "murder",
  "tdm/79": "murder",
  "tdm/88": "murder",
  "dsk/124": "murder",
  "dft/90": "splinter",
  "dft/106": "murder",
  "dsk/110": "murder",
  "dsk/107": "murder",
  "blb/102": "murder",
  "blb/95": "murder",
  "mom/99": "murder",
  "bro/112": "splinter",
  "dmu/94": "murder",
  "woe/106": "murder",
  "neo/87": "murder",

  "hob/69": "stab plague",
  "ecl/97": "plague",
  "tla/118": "plague",
  "spm/63": "plague",
  "fin/111": "plague thoughtseize",
  "tdm/98": "plague salvage",
  "dft/104": "plague",
  "dsk/105": "plague",
  "otj/95": "plague",
  "lci/111": "plague",
  "woe/236": "plague",
  "mom/107": "plague",
  "bro/103": "plague",
  "dmu/86": "plague",
  "snc/89": "plague",
  "neo/110": "plague",

  "fra/50": "edict",
  "hob/63": "edict",
  "eoe/117": "edict",
  "sos/228": "edict",
  "tdm/94": "edict",
  "dft/97": "edict",
  "fin/93": "edict",
  "dsk/117": "edict",
  "blb/87": "edict",
  "mkm/84": "edict",
  "lci/128": "edict",
  "one/116": "edict",
  "one/108": "edict",
  "mom/232": "edict",
  "snc/217": "edict",
  "snc/187": "edict",
  "snc/84": "edict",
  "neo/109": "edict",
  "trk/117": "edict",

  "sos/47": "scatter",
  "dft/63": "scatter",
  "dsk/60": "scatter",
  "bro/61": "scatter",
  "mom/47": "scatter",
  "lci/59": "scatter",
  "blb/58": "scatter cancel",
  "fra/30": "scatter",
  "neo/52": "scatter",

  "fra/25": "cancel",
  "hob/55": "cancel",
  "sos/39": "cancel",
  "ecl/84": "cancel",
  "spm/25": "cancel",
  "eoe/83": "cancel",
  "dsk/77": "cancel",
  "dsk/57": "cancel",
  "lci/69": "cancel scatter",
  "woe/54": "cancel",
  "one/67": "cancel",
  "dmu/48": "cancel",
  "bro/71": "cancel",
  "neo/51": "cancel",

  "eoe/55": "manaleak",
  "one/44": "manaleak",
  "snc/51": "negate",
  "tla/71": "cancel",
  "fin/80": "manaleak",
  "fin/79": "manaleak",
  "tdm/58": "manaleak",
  "tdm/41": "manaleak",
  "dsk/49": "manaleak",
  "tla/58": "manaleak",
  "sos/217": "manaleak",
  "msh/82": "manaleak",
  "hob/35": "manaleak",
  "trk/51": "manaleak",
  "tmt/48": "cancel",
  "blb/45": "manaleak",
  "otj/61": "manaleak",
  "mkm/69": "manaleak",
  "mkm/221": "manaleak",
  "mkm/227": "manaleak",
  "woe/69": "manaleak",
  "mom/46": "cancel",
  "snc/49": "manaleak",
  "neo/63": "manaleak",
  "dmu/62": "manaleak",

  "tmt/47": "negate",
  "trk/62": "cancel",
  "sos/39": "negate",
  "dft/64": "manaleak",

  "fra/54": "murder",


  "fra/120": "dreadmaw",
  "fra/105": "manafork",


  "trk/192": "naturalize",
  "tmt/125": "naturalize",
  "tla/187": "naturalize",
  "eoe/206": "brokenwings",
  "eoe/205": "naturalize",
  "dft/156": "brokenwings",
  "tdm/145": "naturalize",
  "hob/28": "disenchant",
  "fin/171": "brokenwings",
  "dsk/171": "naturalize",
  "dsk/170": "naturalize",
  "blb/203": "naturalize",
  "otj/26": "disenchant",
  "lci/205": "naturalize",
  "lci/9": "disenchant",
  "woe/186": "brokenwings",
  "mom/176": "brokenwings",
  "bro/190": "brokenwings",
  "bro/6": "disenchant",
  "mom/39": "disenchant",
  "one/162": "brokenwings",
  "dmu/183": "naturalize",
  "neo/182": "naturalize",
  "snc/8": "disenchant",
  "neo/3": "disenchant",


  "fra/95": "axe",
  "fra/74": "axe",
  "hob/90": "axe",
  "msh/150": "axe",
  "sos/243": "axe",
  "sos/118": "axe",
  "sos/108": "axe",
  "sos/107": "axe",
  "tmt/85": "axe",
  "ecl/137": "axe",
  "tla/125": "axe",
  "eoe/149": "axe",
  "fin/144": "axe",
  "dft/119": "axe",
  "tdm/114": "axe",
  "dsk/140": "axe",
  "blb/391": "axe",
  "blb/130": "axe",
  "otj/151": "axe",
  "lci/163": "axe",
  "woe/159": "axe",
  "woe/125": "axe",
  "mom/166": "axe",
  "mom/164": "axe",
  "one/141": "axe",
  "bro/155": "axe",
  "snc/119": "axe",
  "dmu/134": "axe",


  "tla/93": "thoughtseize",
  "tdm/70": "thoughtseize",
  "sos/220": "thoughtseize",
  "hob/65": "thoughtseize",
  "dft/92": "thoughtseize",
  "dsk/88": "thoughtseize",
  "otj/78": "thoughtseize",
  "mkm/232": "thoughtseize",
  "mkm/81": "thoughtseize",
  "woe/86": "thoughtseize",
  "mom/127": "thoughtseize",
  "bro/96": "thoughtseize",
  "bro/92": "thoughtseize",
  "dmu/102": "thoughtseize",
  "one/92": "thoughtseize",
  "snc/78": "thoughtseize",
  "neo/119": "thoughtseize",

  "msh/100": "mindrot",
  "sos/203": "mindrot",
  "sos/73": "mindrot",
  "tmt/76": "signinblood",
  "tla/113": "mindrot",
  "blb/105": "mindrot",
  "woe/88": "mindrot",
  "mom/113": "mindrot",
  "dmu/78": "mindrot",
  "neo/103": "mindrot",


  "trk/168": "impulse",
  "spm/79": "surestrike impulse",
  "fin/147": "impulse",
  "tdm/119": "impulse",
  "dsk/147": "impulse",
  "mkm/113": "impulse",
  "mat/27": "impulse",
  "mom/173": "impulse",
  "bro/162": "impulse",
  "snc/128": "impulse",
  "snc/122": "impulse",
  "neo/138": "impulse",


  "trk/144": "surestrike",
  "fra/150": "surestrike",
  "fra/125": "trumpet surestrike",
  "hob/111": "surestrike",
  "tmt/95": "surestrike",
  "msh/154": "surestrike",
  "eoe/156": "surestrike",
  "dft/141": "surestrike",
  "tdm/107": "surestrike",
  "fin/134": "surestrike",
  "dsk/164": "surestrike",
  "blb/159": "surestrike",
  "otj/138": "surestrike",
  "mkm/116": "surestrike",
  "lci/132": "surestrike",
  "woe/138": "surestrike",
  "mom/136": "surestrike",
  "bro/157": "surestrike",
  "dmu/126": "surestrike",
  "snc/243": "surestrike",
  "snc/104": "surestrike",
  "neo/151": "surestrike",


  "dsk/147": "impulse trumpet",
  "msh/134": "trumpet",
  "tla/140": "trumpet",
  "otj/136": "trumpet",
  "woe/131": "trumpet",
  "dmu/151": "trumpet",
  "bro/143": "trumpet",
  "neo/133": "trumpet",


  "trk/17": "cantripper",
  "msh/247": "cantripper",
  "msh/16": "cantripper",
  "tmt/37": "cantripper",
  "hob/34": "cantripper",
  "ecl/183": "cantripper",
  "tla/51": "cantripper",
  "spm/129": "cantripper",
  "tla/135": "cantripper",
  "tdm/163": "cantripper",
  "dsk/33": "cantripper",
  "blb/229": "cantripper",
  "blb/201": "cantripper",
  "otj/114": "cantripper",
  "otj/154": "cantripper",
  "otj/55": "cantripper",
  "mkm/29": "cantripper",
  "woe/241": "cantripper",
  "one/177": "cantripper",
  "one/240": "cantripper",
  "bro/35": "cantripper",
  "dmu/99": "cantripper",
  "snc/18": "cantripper",
  "neo/105": "cantripper",
  "neo/98": "cantripper edict",
  "neo/38": "cantripper",


  "hob/173": "boombox",
  "tla/258": "boombox",
  "tla/254": "boombox",
  "tla/3": "boombox",
  "eoe/246": "boombox",
  "eoe/244": "boombox",
  "fin/262": "boombox",
  "dft/242": "boombox",
  "blb/244": "boombox",
  "otj/241": "pilgrim boombox",
  "lci/259": "boombox",
  "mom/266": "boombox",
  "bro/235": "boombox",
  "snc/241": "boombox",
  "fra/172": "boombox",
  "hob/173": "boombox",


  "ecl/1": "pilgrim",
  "spm/173": "pilgrim",
  "eoe/237": "pilgrim",
  "tdm/242": "pilgrim",
  "otj/248": "pilgrim",
  "lci/260": "pilgrim",
  "lci/250": "pilgrim",
  "mom/264": "pilgrim",
  "one/226": "pilgrim",


  "dft/238": "myr",
  "otj/246": "myr",
  "mom/259": "myr",
  "one/234": "myr",
  "bro/255": "myr",
  "neo/239": "myr",


  "fra/166": "cryptkeeper",
  "ecl/2": "cryptkeeper",
  "spm/168": "cryptkeeper",
  "eoe/237": "cryptkeeper",
  "eoe/236": "cryptkeeper",
  "fin/263": "cryptkeeper",
  "tdm/243": "cryptkeeper",
  "dft/247": "cryptkeeper",
  "dsk/252": "cryptkeeper",
  "mkm/252": "cryptkeeper",
  "lci/254": "cryptkeeper",
  "lci/253": "cryptkeeper",
  "lci/252": "cryptkeeper",
  "mom/262": "cryptkeeper",
  "bro/251": "cryptkeeper",
  "neo/256": "cryptkeeper",

  "ecl/264": "fetchland",
  "spm/188": "fetchland",
  "tdm/255": "fetchland",
  "dsk/269": "fetchland",
  "one/261": "fetchland",
  "woe/256": "fetchland",
  "lci/279": "fetchland",
  "mkm/261": "fetchland",
  "bro/261": "fetchland",
  "snc/255": "fetchland",
  "snc/252": "fetchland",
  "snc/248": "fetchland",
  "snc/249": "fetchland",
  "snc/251": "fetchland",

  "stx/162": "bounce regrowth",
  "trk/183": "fight regrowth",
  "tdm/169": "regrowth",
  "otj/194": "reanimate regrowth",
  "znr/180": "regrowth",
  "msh/162": "regrowth",
  "fra/112": "regrowth",
  "tla/199": "regrowth",
  "eoe/202": "regrowth",
  "tdm/203": "regrowth bite",
  "tdm/153": "regrowth",
  "dft/178": "regrowth",
  "dsk/203": "regrowth",
  "dsk/197": "regrowth",
  "blb/188": "regrowth",
  "lci/218": "regrowth",
  "one/191": "regrowth",
  "dmu/114": "regrowth",
  "neo/205": "regrowth",
  "vow/215": "regrowth",
  "mid/183": "regrowth",

  "fra/62": "reanimate",
  "msh/118": "reanimate",
  "ecl/100": "reanimate",
  "tla/123": "reanimate",
  "spm/61": "reanimate",
  "fin/98": "reanimate",
  "dft/200": "reanimate",
  "dft/76": "reanimate",
  "dft/193": "reanimate",
  "dsk/229": "reanimate",
  "dsk/121": "reanimate",
  "dsk/107": "murder reanimate",
  "mkm/89": "reanimate",
  "lci/103": "reanimate",
  "lci/120": "reanimate",
  "one/112": "reanimate",
  "one/113": "reanimate",
  "bro/109": "reanimate",
  "dmu/108": "reanimate",
  "snc/81": "reanimate",
  "neo/118": "reanimate",

  "fra/8": "reclamation",
  "hob/22": "reclamation",
  "sos/200": "reclamation",
  "eoe/33": "reclamation",
  "fin/29": "reclamation",
  "dsk/34": "reclamation",
  "blb/10": "reclamation",
  "lci/17": "reclamation",
  "mkm/6": "reclamation",
  "woe/26": "reclamation",
  "sos/9": "flicker",
  "ecl/28": "flicker",
  "tmt/149": "flicker bite",
  "eoe/3": "banisher flicker",
  "blb/74": "flicker",
  "blb/71": "bigbird flicker",
  "blb/24": "flicker",
  "otj/14": "giantkiller flicker",
  "woe/23": "flicker",
  "mom/34": "flicker",
  "one/1": "flicker reclamation",
  "neo/40": "o-ring flicker",
  "neo/72": "flicker",
  "hob/44": "flicker",
  "sos/14": "pridemate flicker",

  "hob/106": "rummager",
  "msh/145": "rummager",
  "sos/110": "rummager",
  "tmt/98": "rummager",
  "fra/85": "rummager",
  "fra/246": "rummager",
  "fra/174": "manarock rummager",
  "ecl/144": "rummager",
  "ecl/225": "rummager",
  "tla/238": "rummager",
  "spm/130": "rummager",
  "spm/90": "rummager",
  "fin/239": "rummager",
  "fin/223": "rummager",
  "tdm/116": "rummager",
  "dft/148": "rummager",
  "dsk/142": "rummager",
  "blb/161": "rummager",
  "mkm/141": "rummager",
  "lci/172": "rummager",
  "woe/123": "rummager",
  "mom/142": "rummager",
  "one/120": "rummager",
  "bro/140": "rummager",
  "dmu/128": "rummager",
  "neo/131": "rummager",

  "fra/81": "tunneler",
  "tla/131": "tunneler",
  "tdm/129": "tunneler",
  "dsk/150": "tunneler",
  "dft/188": "tunneler",

  "msh/209": "pinger",
  "fra/151": "pinger",
  "sos/128": "pinger",
  "ecl/161": "pinger",
  "tla/249": "pinger",
  "spm/58": "pinger",
  "dsk/218": "pinger",
  "dsk/137": "pinger",
  "blb/142": "pinger ponger",
  "otj/119": "pinger",
  "lci/168": "pinger",
  "otj/210": "pinger ponger",
  "lci/159": "pinger",
  "woe/156": "pinger",
  "mom/156": "pinger",
  "one/147": "pinger",
  "ecl/206": "ponger",
  "ecl/135": "ponger",
  "msh/137": "ponger",
  "msh/136": "ponger",
  "fra/248": "ponger",
  "spm/75": "ponger",
  "fin/214": "ponger",
  "fin/153": "ponger",
  "eoe/169": "ponger",
  "eoe/233": "ponger",
  "fin/149": "ponger",
  "fin/145": "ponger",
  "fin/93": "edict ponger",
  "fin/92": "ponger",
  "fin/90": "ponger",
  "tdm/175": "ponger",
  "tdm/121": "ponger",
  "tdm/104": "ponger",
  "blb/157": "ponger",
  "blb/131": "ponger",
  "otj/235": "ponger",
  "otj/131": "ponger",
  "mom/243": "ponger",
  "snc/189": "ponger",
  "snc/131": "ponger",

  "fra/164": "vamp",
  "fra/115": "brokenwings",


  "ecl/203": "dreadmaw",
  "trk/189": "dreadmaw",
  "msh/185": "dreadmaw",
  "sos/189": "dreadmaw",
  "spm/116": "dreadmaw",
  "fin/173": "dreadmaw",
  "dsk/198": "dreadmaw",
  "otj/158": "dreadmaw",
  "tdm/141": "dreadmaw",
  "dft/170": "dreadmaw",
  "mkm/228": "dreadmaw",
  "mkm/179": "dreadmaw",
  "lci/177": "dreadmaw",
  "mom/210": "dreadmaw",
  "woe/173": "dreadmaw",
  "bro/197": "dreadmaw",
  "one/183": "dreadmaw",
  "fra/119": "dreadmaw",
  "bro/184": "dreadmaw",
  "snc/155": "dreadmaw",
  "neo/189": "dreadmaw",
  "dmu/191": "dreadmaw",

  "fra/133": "thopterist",
  "fra/123": "recover",
  "fra/275": "thopterist",
  "fra/134": "fakedeath",
  "fra/144": "mulch ramp",


  "fra/265": "wurm",
  "fra/260": "wurm",
  "tmt/69": "fakedeath",
  "fin/126": "fakedeath",
  "otj/87": "fakedeath",
  "woe/101": "fakedeath",
  "lci/106": "fakedeath",
  "mkm/100": "fakedeath",
  "one/99": "fakedeath",
  "neo/121": "fakedeath",
  "bro/85": "fakedeath",
  "ecl/101": "vamp rats",
}


templateDefinitions = {


  //WHITE

  "banisher": {
    "display": "Banisher",
    "color": "W",
    "query": "otag:banish t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Abanish+t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "White creature that exiles a permanent until it leaves",
  },
  "marshal": {
    "display": "Marshal",
    "color": "W",
    "query": "otag:activated-ability otag:power-boost-to-all id>=w (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aactivated-ability+otag%3Apower-boost-to-all+id%3E%3Dw+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "White creature with an activated ability to pump the board",
  },
  "pridemate": {
    "display": "Pridemate",
    "color": "W",
    "query": "otag:repeatable-pp-counters id>=w (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Arepeatable-pp-counters+id%3E%3Dw+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "White creature that grows over time",
  },
  "angel": {
    "display": "Serra Angel",
    "color": "W",
    "query": "kw:flying t:creature id=w (st:expansion r:u) sort:date",
    "url": "https://scryfall.com/search?q=kw%3Aflying+t%3Acreature+id%3Dw+%28st%3Aexpansion+r%3Au%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "White uncommon with large stats and flying",
  },



  "giantkiller": {
    "display": "Giant Killer",
    "color": "W",
    "category": "removal",
    "query": "id=w (otag:removal otag:hate-high-pt or otag:hate-high-mv) (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=id%3Dw+%28otag%3Aremoval+otag%3Ahate-high-pt+or+otag%3Ahate-high-mv%29+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "White removal for large creatures",
  },
  "o-ring": {
    "display": "O-Ring",
    "color": "W",
    "category": "removal",
    "query": "otag:banish -t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Abanish+-t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "White enchantment that exiles a permanent until it leaves",
  },
  "disenchant": {
    "display": "Disenchant",
    "color": "W",
    "category": "semiremoval",
    "query": "otag:disenchant-naturalize (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Adisenchant-naturalize+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "White removal for an artifact or enchantment",
  },


  "flicker": {
    "display": "Flicker",
    "color": "W",
    "query": "otag:flicker (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aflicker+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Exile a creature, then return it to the battlefield",
  },
  "reclamation": {
    "display": "Reclamation",
    "color": "W",
    "query": "otag:reanimate-creature otag:low-mana-value-matters (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Areanimate-creature+otag%3Alow-mana-value-matters+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Return a low-cost creature from graveyard to battlefield",
  },


  "example": {
    "display": "WhiteExample",
    "color": "W",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "aaaaa",
  },


  //BLUE


  "bigbird": {
    "display": "Big Bird",
    "color": "U",
    "query": "id=u r:c kw:flying mv>=5 (st:expansion) sort:date",
    "url": "https://scryfall.com/search?q=id%3Du+r%3Ac+kw%3Aflying+mv%3E%3D5+%28st%3Aexpansion%29&unique=cards&as=grid&order=released",
    "help": "Blue creature with flying for 4+ mana",
  },
  "bluedork": {
    "display": "Blue Dork",
    "color": "U",
    "query": "otag:mana-dork id=u (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Amana-dork+id%3Du+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "Blue creature that taps for mana",
  },


  "cancel": {
    "display": "Cancel",
    "color": "U",
    "category": "removal",
    "query": "otag:counterspell mana>=uu (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Acounterspell+mana%3E%3Duu+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Blue counterspell, unconditional. Often has two blue pips.",
  },
  "scatter": {
    "display": "Essence Scatter",
    "color": "U",
    "category": "removal",
    "query": "otag:counterspell-creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Acounterspell-creature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Blue counterspell that can counter a creature spell, but not all spells",
  },
  "manaleak": {
    "display": "Mana Leak",
    "color": "U",
    "category": "removal",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "Blue counterspell that asks for payment from the opponent",
  },
  "lockdown": {
    "display": "Lockdown",
    "color": "U",
    "category": "removal",
    "query": "otag:lockdown-creature (st:expansion)",
    "url": "https://scryfall.com/search?q=otag%3Alockdown-creature+%28st%3Aexpansion%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Blue removal that keeps enchanted creature tapped",
  },


  "bounce": {
    "display": "Bounce",
    "color": "U",
    "category": "semiremoval",
    "query": "otag:removal-bounce -is:permanent (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aremoval-bounce+-is%3Apermanent+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
  },
  "negate": {
    "display": "Negate",
    "color": "U",
    "category": "semiremoval",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "Blue counterspell that can counter only some noncreature spells",
  },
  "tuck": {
    "display": "Tuck",
    "color": "U",
    "category": "semiremoval",
    "query": "otag:removal-tuck (-is:permanent or kw:channel) id=u (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aremoval-tuck+%28-is%3Apermanent+or+%28s%3Aneo+cn%3A69%29%29+id%3Du+%28st%3Aexpansion+r%3Cr%29+sort%3Adate",
    "help": "Blue removal that puts a creature on top (and/or bottom) of library",
  },








  "draw3": {
    "display": "Ancestral",
    "color": "U",
    "help": "Blue spell that draws three cards",
    //otag:card-advantage id=u (st:expansion r<r) sort:date o:three
  },

  "draw2": {
    "display": "Divination",
    "color": "U",
    "help": "Blue spell that draws two cards",
  },
  "dig": {
    "display": "Filter",
    "color": "U",
    "query": "otag:card-advantage (o:look or o:reveal) id=u -t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Acard-advantage+%28o%3Alook+or+o%3Areveal%29+id%3Du+-t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Blue spell that draws one card, with selection",
  },
  "wipeout": {
    "display": "Wipeout",
    "color": "U",
    "url": "https://scryfall.com/search?q=otag%3Amultiple-targets+id%3E%3Du+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Blue spell that stuns or bounces two or more targets",
  },


  "example": {
    "display": "BlueExample",
    "color": "U",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "aaaaa",
  },


  //BLACK

  "imp": {
    "display": "Imp",
    "color": "B",
    "query": "id=b r:c o:flying (st:expansion) sort:date",
    "url": "https://scryfall.com/search?q=id%3Db+r%3Ac+o%3Aflying+%28st%3Aexpansion%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black flyer with small stats",
  },
  "rats": {
    "display": "Ravenous Rats",
    "color": "B",
    "query": "id=b t:creature otag:discard (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=id%3Db+t%3Acreature+otag%3Adiscard+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black creature that makes the opponent discard",
  },
  "vamp": {
    "display": "Vamp",
    "color": "B",
    "query": "id=b r:c o:flying (st:expansion) sort:date",
    "url": "https://scryfall.com/search?q=id%3Db+r%3Ac+o%3Aflying+%28st%3Aexpansion%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black flyer with medium stats. Often has haste or deals direct damage",
  },


  "splinter": {
    "display": "Bone Splinters",
    "color": "B",
    "category": "removal",
    "query": "otag:removal otag:more-expensive-than-mv id=b (st:expansion r<r) sort:date", //TODO
    "url": "https://scryfall.com/search?q=otag%3Aremoval+otag%3Amore-expensive-than-mv+id%3Db+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black removal spell with an additional cost",
  },
  "edict": {
    "display": "Edict",
    "color": "B",
    "category": "removal",
    "query": "otag:removal-sacrifice otag:removal-creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aremoval-sacrifice+otag%3Aremoval-creature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black removal spell that forces sacrifice",
  },
  "murder": {
    "display": "Murder",
    "color": "B",
    "category": "removal",
    "query": "otag:removal-destroy id=b (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aremoval-destroy+id%3Db+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black removal spell, no conditions",
  },
  "plague": {
    "code": "CB15",
    "display": "Plague",
    "color": "B",
    "category": "removal",
    "query": "otag:sweeper otag:removal-toughness (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Asweeper+otag%3Aremoval-toughness+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "Black sweeper that gives a small -N/-N to all creatures",
  },
  "stab": {
    "code": "CB15",
    "display": "Stab",
    "color": "B",
    "category": "removal",
    "query": "otag:removal-toughness (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aremoval-toughness+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black removal that gives -N/-N",
  },


  "mindrot": {
    "display": "Mind Rot",
    "color": "B",
    "category": "semiremoval",
    "query": "otag:discard -otag:thoughtseize (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Adiscard+-otag%3Athoughtseize+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black spell that makes opponent discard two or more cards",
  },
  "thoughtseize": {
    "display": "Thoughtseize",
    "color": "B",
    "category": "semiremoval",
    "query": "otag:thoughtseize -t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Athoughtseize+-t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black discard spell that lets you choose",
  },


  "fakedeath": {
    "display": "Fake Death",
    "color": "B",
    "query": "otag:cheat-death -kw:earthbend -t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Acheat-death+-kw%3Aearthbend+-t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black spell that returns a creature to the battlefield when it dies",
  },
  "reanimate": {
    "display": "Reanimate",
    "color": "B",
    "query": "otag:reanimate-creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Areanimate-creature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Return creature from graveyard to battlefield",
  },
  "salvage": {
    "code": "CB16",
    "display": "Salvage",
    "color": "B",
    "query": "otag:regrowth-creature otag:multiple-targets id>=b (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aregrowth-creature+otag%3Amultiple-targets+id%3E%3Db+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Black spell that returns two cards from graveyard to hand",
  },
  "signinblood": {
    "display": "Sign in Blood",
    "color": "B",
    "help": "Black spell that draws two cards for an extra cost",
  },



  "example": {
    "display": "BlackExample",
    "color": "B",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "aaaaa",
  },


  //RED


  "pinger": {
    "display": "Pinger",
    "color": "R",
    "query": "otag:pinger (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Apinger+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Small red creature with an activated ability that deals 1 or 2 damage",
  },
  "ponger": {
    "display": "Ponger",
    "color": "R",
    "query": "otag:pinger (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Apinger+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Small red creature with a trigger that deals 1 or 2 damage",
  },
  "rummager": {
    "display": "Rummager",
    "color": "R",
    "query": "otag:repeatable-rummage (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Arepeatable-rummage+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Red creature that can repeatedly discard to draw",
  },
  "tunneler": {
    "display": "Tunneler",
    "color": "R",
    "query": "otag:tunneling (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Atunneling+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Red creature that makes a small creature unblockable",
  },


  "axe": {
    "display": "Lava Axe",
    "color": "R",
    "category": "removal",
    "query": "otag:burn id>=r mv>=4 -t:creature r<r (st:expansion) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aburn+id%3E%3Dr+mv%3E%3D4+-t%3Acreature+r%3Cr+%28st%3Aexpansion%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Red burn spell that's expensive and deals high damage",
  },


  "impulse": {
    "display": "Reckless Impulse",
    "color": "R",
    "query": "otag:impulsive-draw (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aimpulsive-draw+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Red spell that exiles two or more cards from your library to cast soon",
  },
  "surestrike": {
    "display": "Sure Strike",
    "color": "R",
    "query": "otag:gives-first-strike -t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Agives-first-strike+-t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Red spell that gives target creature first strike at instant speed",
  },
  "trumpet": {
    "display": "Trumpet Blast",
    "color": "R",
    "query": "otag:power-boost-to-all -t:creature id>=r (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Apower-boost-to-all+-t%3Acreature+id%3E%3Dr+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Red spell that pumps the board",
  },



  "example": {
    "display": "RedExample",
    "color": "R",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "aaaaa",
  },


  //GREEN


  "dreadmaw": {
    "display": "Dreadmaw",
    "color": "G",
    "query": "mv>=6 id>=g -is:hybrid t:creature (st:expansion r:c) sort:date",
    "url": "https://scryfall.com/search?q=mv%3E%3D6+id%3E%3Dg+-is%3Ahybrid+t%3Acreature+%28st%3Aexpansion+r%3Ac%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "6 mana common green creature",
  },
  "manadork": {
    "display": "Mana Dork",
    "color": "G",
    "query": "otag:mana-dork (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Amana-dork+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "Creature that taps for mana",
  },
  "manafork": {
    "display": "Multimana Dork",
    "color": "G",
    "query": "otag:mana-dork (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Amana-dork+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "Creature that taps for 2+ mana",
  },
  "wurm": {
    "display": "Wurm",
    "color": "G",
    "query": "id=g mv>=7 (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=id%3Dg+mv%3E%3D7+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Big green creature,",
  },


  "bite": {
    "display": "Bite Spell",
    "color": "G",
    "category": "removal",
    "query": "otag:one-sided-fight (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aone-sided-fight+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Green removal that causes a one-sided fight",
  },
  "brokenwings": {
    "display": "Broken Wings",
    "color": "G",
    "category": "removal",
    "query": "otag:removal-flying (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Adisenchant-naturalize+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Green flyer removal",
  },
  "fight": {
    "display": "Fight Spell",
    "color": "G",
    "category": "removal",
    "query": "kw:fight (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=kw%3Afight+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Green removal that causes a fight",
  },
  "naturalize": {
    "display": "Naturalize",
    "color": "G",
    "category": "semiremoval",
    "query": "otag:disenchant-naturalize (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Adisenchant-naturalize+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Green removal for an artifact or enchantment",
  },



  "mulch": {
    "display": "Mulch",
    "color": "G",
    "query": "id=g otag:impulse -t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=id%3Dg+otag%3Aimpulse+-t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "Green spell that draws one card with selection",
  },
  "ramp": {
    "display": "Ramp",
    "color": "G",
    "query": "otag:ramp (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aramp+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Green spell that puts a land or equivalent onto the battlefield",
  },
  "regrowth": {
    "display": "Regrowth",
    "color": "G",
    "query": "otag:regrowth -t:creature id>=g (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aregrowth+-t%3Acreature+id%3E%3Dg+%28st%3Aexpansion+r%3Cr%29+sort%date&unique=cards&as=grid&order=name",
    "help": "Green spell that returns a card from graveyard to hand",
  },


  "example": {
    "display": "GreenExample",
    "color": "G",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "aaaaa",
  },


  //MIXED


  "cryptkeeper": {
    "display": "Cryptkeeper",
    "color": "A",
    "query": "otag:hate-graveyard id=c t:creature (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Ahate-graveyard+id%3Dc+t%3Acreature+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Artifact creature that removes cards from a graveyard",
  },
  "myr": {
    "display": "Myr",
    "color": "A",
    "query": "otag:mana-rock (st:expansion r<r) date:year",
    "url": "https://scryfall.com/search?q=otag%3Amana-rock+%28st%3Aexpansion+r%3Cr%29+date%3Ayear&unique=cards&as=grid&order=released",
    "help": "Artifact creature that taps for mana",
  },
  "pilgrim": {
    "display": "Pilgrim's Eye",
    "color": "A",
    "query": "otag:tutor-land -t:land id=c (st:expansion r<r is:booster) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Atutor-land+-t%3Aland+id%3Dc+%28st%3Aexpansion+r%3Cr+is%3Abooster%29+sort%3Adate&unique=prints&as=grid&order=name",
    "help": "Artifact or colorless spell that tutors for a land",
  },


  "boombox": {
    "display": "Boom Box",
    "color": "A",
    "category": "removal",
    "query": "otag:removal id=c (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aremoval+id%3Dc+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Artifact or colorless spell that can expensively remove a creature",
  },


  "fetchland": {
    "display": "Fetchland",
    "color": "A",
    "query": "otag:tutor-land t:land id=c (st:expansion r<r is:booster) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Atutor-land+t%3Aland+id%3Dc+%28st%3Aexpansion+r%3Cr+is%3Abooster%29+sort%3Adate&unique=prints&as=grid&order=name",
    "help": "Land that sacrifices to tutor for another land",
  },
  "manarock": {
    "display": "Mana Rock",
    "color": "A",
    "query": "otag:mana-rock (st:expansion r<r) date:year",
    "url": "https://scryfall.com/search?q=otag%3Amana-rock+%28st%3Aexpansion+r%3Cr%29+date%3Ayear&unique=cards&as=grid&order=released",
    "help": "Noncreature artifact that taps for mana",
  },


  "recover": {
    "display": "Recoverer",
    "color": "X",
    "query": "otag:regrowth-self (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aregrowth-self+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Creature that returns itself from graveyard to hand",
  },
  "cantripper": {
    "display": "Cantrip Vanilla",
    "color": "X",
    "query": "otag:pure-draw otag:flavors-of-vanilla (st:expansion r<r) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Apure-draw+otag%3Aflavors-of-vanilla+%28st%3Aexpansion+r%3Cr%29+sort%3Adate&unique=cards&as=grid&order=name",
    "help": "Creature whose main feature is replacing itself"
  },
  "swap": {
    "display": "Pathlike",
    "color": "X",
    "category": "removal",
    "query": "otag:swap-removal (st:expansion) sort:date",
    "url": "https://scryfall.com/search?q=otag%3Aswap-removal+%28st%3Aexpansion%29+sort%3Adate&unique=cards&as=grid&order=released",
    "help": "Spell that removes a creature but gives a resource to its controller",
  },
  "thopterist": {
    "display": "Thopterist",
    "color": "X",
    "help": "Creature that creates a flying token on enter",
  },


  "example": {
    "display": "Test",
    "color": "A",
    "query": "aaaaa",
    "url": "aaaaa",
    "help": "aaaaa",
  },
}


main();
