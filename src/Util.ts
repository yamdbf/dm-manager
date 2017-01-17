/**
 * Remove any non alphanumeric characters from the given text
 * and lowercase it
 */
export function normalize(text: string): string
{
	return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}
