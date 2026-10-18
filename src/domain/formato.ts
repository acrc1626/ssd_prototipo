/** Formato numérico es-CO consistente en toda la app (punto de miles, coma decimal),
 *  en vez de strings armados a mano pantalla por pantalla. */
export function formatearNumero(valor: number, decimales = 1): string {
  return valor.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function formatearEntero(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

/** `10-nov-2026`: igual al formato de las capturas, sin la raya (CLAUDE.md regla 8). */
export function formatearFecha(fechaIso: string): string {
  const fecha = new Date(fechaIso.length === 10 ? fechaIso + 'T00:00:00' : fechaIso);
  const dia = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  return `${dia}-${mes}-${fecha.getFullYear()}`;
}

export function unirConY(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}
