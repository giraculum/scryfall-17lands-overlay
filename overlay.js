// ==UserScript==
// @name        Scryfall 17Lands Overlay
// @namespace   Violentmonkey Scripts
// @icon
// @version     0.2.0
//
// @match       *://scryfall.com/*
// @grant       GM_addStyle
// @grant       GM_addElement
// @grant       GM_getResourceText
//
// @resource    resGrades https://giraculum.github.io/grades.json
// @author      Giraculum
// @description Overlays rankings from 17Lands data onto Scryfall searches
// ==/UserScript==

function main(){
  let allGrades = JSON.parse(GM_getResourceText("resGrades"));

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

  function addOverlays(card, url) {
    let match = url.match(/card\/([^\/]*\/\d*\w?)/)
    if (!match) {return;}
    let cardGrades = allGrades[match[1]]
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
    }
  `);
};

main();
