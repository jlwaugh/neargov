import { diffWords } from "diff";

export function diffPartialText(oldText: string, newText: string): string {
  const oldTextToCompare =
    oldText.length > newText.length
      ? oldText.slice(0, newText.length)
      : oldText;
  const changes = diffWords(oldTextToCompare, newText);
  let result = "";

  for (const part of changes) {
    if ((part as any).added) {
      result += `<em style="font-style: italic; color: #166534; background-color: #dcfce7;">${escapeHtml(
        part.value
      )}</em>`;
    } else if ((part as any).removed) {
      result += `<s style="text-decoration: line-through; color: #991b1b; background-color: #fee2e2;">${escapeHtml(
        part.value
      )}</s>`;
    } else {
      result += escapeHtml(part.value);
    }
  }
  if (oldText.length > newText.length) {
    result += escapeHtml(oldText.slice(newText.length));
  }
  return result;
}

function escapeHtml(s: string) {
  return s
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");
}
