module.exports = async function renderString(template, ...substitutions) {
  substitutions = substitutions.map(async substitution => {
    if (Array.isArray(substitution)) {
      substitution = (await Promise.all(substitution)).join("");
    }
    return substitution;
  });
  substitutions = await Promise.all(substitutions);
  return String.raw(template, ...substitutions);
};
