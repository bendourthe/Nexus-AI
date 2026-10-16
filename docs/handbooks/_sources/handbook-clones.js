(() => {
  'use strict';
  const holders = document.querySelectorAll('[data-hb-clone]');
  holders.forEach((holder, index) => {
    const source = document.getElementById(holder.dataset.hbClone);
    if (!source || !source.childNodes.length) throw new Error(`Missing handbook source unit: ${holder.dataset.hbClone}`);
    const copy = source.cloneNode(true);
    const ids = new Map();
    const elements = [copy, ...copy.querySelectorAll('*')];
    elements.forEach((element) => {
      if (element.id) { const old = element.id; element.id = `dv-copy-${index}-${old}`; ids.set(old, element.id); }
    });
    elements.forEach((element) => {
      Array.from(element.attributes).forEach(({name, value}) => {
        let changed = value;
        for (const [old, replacement] of ids) changed = changed.split(`url(#${old})`).join(`url(#${replacement})`);
        if ((name === 'href' || name === 'xlink:href') && value.startsWith('#') && ids.has(value.slice(1))) changed = `#${ids.get(value.slice(1))}`;
        if (['aria-labelledby', 'aria-describedby', 'aria-controls', 'for', 'headers'].includes(name)) changed = value.split(/\s+/).map(id => ids.get(id) || id).join(' ');
        if (changed !== value) element.setAttribute(name, changed);
      });
    });
    if (holder.tagName === 'LI') holder.replaceWith(copy);
    else holder.append(copy);
  });
})();
