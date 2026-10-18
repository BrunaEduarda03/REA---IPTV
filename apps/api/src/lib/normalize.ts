/** Minúsculas + sem acentuação — usado para busca textual que não deve
 * depender do usuário digitar acentos corretamente. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
