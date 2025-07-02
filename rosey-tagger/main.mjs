/**
 * @import {Root} from 'hast'
 */

import fs from "fs";
import path from "path";

import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeFormat from "rehype-format";
import slugify from "slugify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

// Find all of the .html pages in the build output
// Parse the page looking for elements with the property of dataRoseyTagger
// Walk the contents of the element we find the tag on
// Keep walking its children until we find the most nested block elements
// Get all of their inner text for each of these elements
// Format the text, stripping it of inline html elements
// Add a data-rosey id with the formatted text
// If the innerText comes back as empty (like in a placeholder span that is for a style) don't add the tag at all
// Keep walking until we've looked through the whole page
// Keep walking until we've walked all of the .html pages
// Sanitise the html
// Parse the AST back into html and write it back to where we found it

const tagNameToLookFor = "dataRoseyTagger"; // Prop names are camelCased
const testPagePath = "rosey-tagger/test-files/index-reduced.html";
const testPageToWritePath = "rosey-tagger/index.html";

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
  console.log(`Parsing file: ${testPagePath}`);
  const file = await unified()
    .use(rehypeParse)
    .use(tagHtmlWithDataTags)
    .use(rehypeStringify)
    .use(rehypeFormat)
    .process(htmlToParse);

  // Write tagged file
  await fs.promises.writeFile(testPageToWritePath, file.value);
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
          `Found the tag we're looking for on the element ${node.tagName} on line ${node.position.start.line}`
        );
        // Walk the contents of the element we find the tag on
        walkChildren(node);
      }
    });
  };
}

function walkChildren(node) {
  for (const child of node.children) {
    if (!nodeIsWhiteSpace(child) && child.children) {
      // Keep walking until we find the most nested block elements
      if (hasNestedBlockElements(child.children)) {
        walkChildren(child);
      } else {
        // Found the lowest block level element
        const innerText = extractTextChildren(child.children);
        // Add a data-rosey tag to it with slugified inner text
        if (innerText) {
          child.properties["data-rosey"] = slugify(innerText);
        }
      }
    }
  }
}

// Some nodes are just whitespace
function nodeIsWhiteSpace(node) {
  if (node.type === "text" && node.value.replaceAll("\n", "").trim() === "") {
    return true;
  }
  return false;
}

function hasNestedBlockElements(node) {
  let itDoes = false;
  for (const child of node) {
    if (
      child.type === "element" &&
      blockLevelElements.includes(child.tagName)
    ) {
      itDoes = true;
    }
  }
  return itDoes;
}

// Extract the text from inside the most nested block level elements
function extractTextChildren(node) {
  let innerText = "";
  for (const child of node) {
    // If the child is text, and doesn't have its own inline element children add to the inner text
    if (child.value) {
      const innerTextFormatted = child.value.replaceAll("\n", "");
      innerText += innerTextFormatted;
      // Otherwise use a recursive function to walk through the inline elements, which are also children
    } else {
      innerText += getInnerTextFromInlineElements(child);
    }
  }
  return innerText;
}

// A recursive function to get the inner text, which is kept track of in the calling function (extractTextChildren)
function getInnerTextFromInlineElements(node) {
  let innerText = "";
  for (const child of node.children) {
    if (child.value) {
      const innerTextFormatted = child.value;
      innerText += innerTextFormatted;
    } else {
      innerText += getInnerTextFromInlineElements(child);
    }
  }
  return innerText;
}
