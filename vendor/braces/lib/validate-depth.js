 'use strict';
module.exports = function validateDepth(ast) {
  const pending = [[ast, 0]];
  const seen = new Set();
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (depth > 128 || seen.size > 65536) throw new SyntaxError('Brace AST exceeds resource limits.');
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node)) throw new SyntaxError('Brace AST contains a cycle.');
    seen.add(node);
    for (const child of node.nodes || []) pending.push([child, depth + 1]);
  }
};
