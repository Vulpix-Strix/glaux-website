/**
 * The files of one version of the synced documentation, with paths relative to the version,
 * so the `dir` i18n parser reads their first segment as the language.
 */
export function versionSource<S extends { files: { path: string }[] }>(source: S, version: string): S {
  const prefix = `${version}/`;
  const files = source.files.filter((file) => file.path.startsWith(prefix)).map((file) => ({ ...file, path: file.path.slice(prefix.length) }));
  return { ...source, files };
}
