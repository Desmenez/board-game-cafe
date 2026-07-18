import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const assetsDir = path.resolve('dist/assets');
const cssFiles = fs.readdirSync(assetsDir).filter((name) => name.endsWith('.css'));

let result = null;

for (const file of cssFiles) {
  const css = fs.readFileSync(path.join(assetsDir, file), 'utf8');
  const root = postcss.parse(css);
  let resetRule = null;
  let marginUtility = null;

  root.walkRules((rule) => {
    const hasZeroMargin = rule.nodes?.some(
      (node) => node.type === 'decl' && node.prop === 'margin' && node.value === '0',
    );
    const hasZeroPadding = rule.nodes?.some(
      (node) => node.type === 'decl' && node.prop === 'padding' && node.value === '0',
    );

    if (rule.selector === '*' && hasZeroMargin && hasZeroPadding) {
      resetRule = rule;
    }
    if (rule.selector?.includes('.mx-auto')) {
      marginUtility = rule;
    }
  });

  if (!resetRule || !marginUtility) continue;

  result = {
    resetLayer: resetRule.parent?.type === 'atrule' ? resetRule.parent.params : null,
    utilityLayer: marginUtility.parent?.type === 'atrule' ? marginUtility.parent.params : null,
    componentsBeforeUtilities: css.indexOf('@layer components') < css.indexOf('@layer utilities'),
  };
  break;
}

const pass =
  result?.resetLayer === 'components' &&
  result.utilityLayer === 'utilities' &&
  result.componentsBeforeUtilities;

if (!pass) {
  console.error('Tailwind cascade check failed:', result);
  console.error(
    'The global margin/padding reset must stay in @layer components so Tailwind layout utilities can override it.',
  );
  process.exit(1);
}

console.log('Tailwind cascade check passed.');
