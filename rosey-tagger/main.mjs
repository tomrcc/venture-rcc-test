/**
 * @import {Root} from 'hast'
 */

import fs from "fs";
import path from "path";

import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const tagNameToLookFor = "dataRoseyTagger"; // Prop names are camelCased
const testPagePath = "rosey-tagger/test-files/index-basic.html";

const blockLevelElements = [
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ol",
  "ul",
  "li",
];

// Main function
(async () => {
  const htmlToParse = await fs.promises.readFile(testPagePath, "utf8");
  const file = await unified()
    .use(rehypeParse)
    .use(tagHtmlWithDataTags)
    .use(rehypeStringify)
    .process(htmlToParse);
})();

function tagHtmlWithDataTags() {
  /**
   * @param {Root} tree
   */
  return function (tree) {
    visit(tree, "element", function (node) {
      // Check for the tag name we're looking for on any html element
      if (Object.keys(node.properties).includes(tagNameToLookFor)) {
        console.log(
          `Found the tag we're looking for on the element ${node.tagName} at ${node.position}`
        );
        // Walk the contents of the element we find the tag on
        // Keep walking until we find the most nested block elements
        // Keep walking until we find all the most nested elements inside, not just the first most nested one
        walkChildren(node);
      }
    });
  };
}

function walkChildren(node) {
  const nodesChildren = node.children;

  for (const child of nodesChildren) {
    if (!nodeIsWhiteSpace(child) && child.children) {
      if (hasNestedBlockElements(child.children)) {
        walkChildren(child);
      } else {
        console.log("Found a real one yo");
        // console.log({ child });
        // console.log(child.children);
      }
    }
  }
}

function nodeIsWhiteSpace(node) {
  if (node.type === "text" && node.value.replaceAll("\n", "").trim() === "") {
    return true;
  }
  return false;
}

function hasNestedBlockElements(children) {
  let itDoes = false;
  for (const node of children) {
    if (node.type === "element" && blockLevelElements.includes(node.tagName)) {
      itDoes = true;
    }
  }
  return itDoes;
}

// TODO:
// Get all of their inner text for each of these elements
// Format the text, stripping it of inline html elements
// Add a data-rosey id with the formatted text
// Exit out of the element and look through the rest of the page
// Exit out of the page and walk the rest of the pages
// Sanitise the html
// Parse the AST back into html and write it back to where we found it
