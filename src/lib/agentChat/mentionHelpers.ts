export type MentionState = { active: boolean; node: Node | null; startOffset: number; endOffset: number };

export function insertReferenceIntoChatInput(
  chatInputEl: HTMLDivElement,
  mentionState: MentionState,
  result: { url: string; name: string; logo: string },
  onMentionCleared: () => void,
): void {
  chatInputEl.focus();
  const selection = window.getSelection();
  let range: Range;
  if (mentionState.active && mentionState.node && document.contains(mentionState.node)) {
    range = document.createRange();
    range.setStart(mentionState.node, mentionState.startOffset);
    range.setEnd(mentionState.node, mentionState.endOffset);
    range.deleteContents();
    onMentionCleared();
  } else if (selection && selection.rangeCount > 0) {
    range = selection.getRangeAt(0);
    if (!chatInputEl.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(chatInputEl);
      range.collapse(false);
    }
  } else {
    range = document.createRange();
    range.selectNodeContents(chatInputEl);
    range.collapse(false);
  }
  const beforeSpace = document.createTextNode("\u200B");
  range.insertNode(beforeSpace);
  range.setStartAfter(beforeSpace);
  range.collapse(true);
  const refNode = document.createElement("span");
  refNode.contentEditable = "false";
  refNode.className =
    "inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-card border border-border align-middle mx-1 cursor-default shadow-sm select-none";
  refNode.innerHTML = `<img src="${result.logo}" alt="" class="w-3.5 h-3.5 rounded-sm pointer-events-none" /><span class="text-xs font-medium text-foreground max-w-[120px] truncate pointer-events-none">${result.name}</span>`;
  range.insertNode(refNode);
  range.setStartAfter(refNode);
  range.collapse(true);
  const afterSpace = document.createTextNode("\u00A0");
  range.insertNode(afterSpace);
  range.setStartAfter(afterSpace);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
