(function() {
  const logAndEvalCode = `
    console.oldLog = console.log;
    function stringify(e) {
      if (Array.isArray(e)) return JSON.stringify(e.map(f => String(f)));
      return String(e);
    }
    console.log = (...s) => elem.innerText += \`\${s.map(e => String(e)).join(', ')}\n\`;
    console.logAndEval = (s) => elem.innerText += \`\${s}: \${stringify(eval(s))}\n\`;
  `;
  const restoreLog = `
    console.log = console.oldOld;
  `;
  const stepperRegexp = /^\/\/!Step/m;
  const codeBlocks = document.querySelectorAll('div.highlight pre');
  Array.from(codeBlocks).forEach(codeBlock => {
    if (!stepperRegexp.test(codeBlock.textContent)) return;

    let nextStepper = codeBlock.firstChild;
    // While there’s unprocessed blocks
    while (nextStepper) {
      let stepItems = [nextStepper];
      while(
        stepItems[0].nextSibling 
        &&
        !stepperRegexp.test(stepItems[0].nextSibling.textContent)
      )
        stepItems.unshift(stepItems[0].nextSibling);
      
      nextStepper = stepItems[0].nextSibling
      const stepContainer = document.createElement('span');
      stepContainer.classList.add('step');
      stepItems.reverse().slice(1).forEach(item => stepContainer.appendChild(item));
      codeBlock.removeChild(stepItems[0]);
      codeBlock.insertBefore(stepContainer, nextStepper);

      while(stepContainer.firstChild && stepContainer.firstChild.nodeName === '#text') 
        stepContainer.removeChild(stepContainer.firstChild)
      while(stepContainer.lastChild && stepContainer.lastChild.nodeName === '#text') 
        stepContainer.removeChild(stepContainer.lastChild)

      if (stepContainer.childElementCount <= 0) {
        stepContainer.parentNode.removeChild(stepContainer);
      }

      stepContainer.setAttribute('contenteditable', 'true');
    }
    codeBlock.querySelector('.step:first-of-type').classList.add('active');
    const steps = codeBlock.querySelectorAll('.step');
    Array.from(steps).forEach((step, i) => {
      step.dataset.step = i+1;
      step.dataset.maxstep = steps.length;
    });

    const controlPanel = document.createElement('div');
    controlPanel.classList.add('control-panel');
    controlPanel.innerHTML = `
      <div class="buttons">
        <button class="prev">&lt;</button>
        <button class="run">Run</button>
        <button class="next">&gt;</button>
      </div>
      <pre class="output">
      </pre>
    `;

    const output = controlPanel.querySelector('.output');
    controlPanel.querySelector('.run').addEventListener('click', _ => {
      const step = codeBlock.querySelector('.step.active');
      if (!step) return;
      output.innerText = '';
      try {
        const f = new Function('elem', logAndEvalCode + step.innerText + restoreLog);
        f.call(self, output);
      } catch (e) {
        output.innerText += `Throw: ${e.toString()}`;
      }
    });

    controlPanel.querySelector('.next').addEventListener('click', event => {
      const step = codeBlock.querySelector('.step.active');
      if (!step.nextElementSibling) return;
      output.innerText = '';
      step.classList.remove('active');
      step.nextElementSibling.classList.add('active');
    });
    
    controlPanel.querySelector('.prev').addEventListener('click', event => {
      const step = codeBlock.querySelector('.step.active');
      if (!step.previousElementSibling) return;
      output.innerText = '';
      step.classList.remove('active');
      step.previousElementSibling.classList.add('active');
    });
    codeBlock.parentNode.appendChild(controlPanel);
  });



})();