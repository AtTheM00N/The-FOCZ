export type FilmInteraction = {
  pointer: [number, number]
  point: [number, number, number]
  hovered: boolean
  pulseAt: number
  pulsePoint: [number, number, number]
}

export function createFilmInteraction(): FilmInteraction {
  return { pointer: [0, 0], point: [0, .5, .545], hovered: false, pulseAt: -10, pulsePoint: [0, .5, .545] }
}

export function pulseInteraction(interaction: FilmInteraction, point = interaction.point) {
  interaction.pulseAt = performance.now() / 1000
  interaction.pulsePoint = [...point]
}

export function hoverInteraction(interaction: FilmInteraction, hovered: boolean, point?: [number, number, number], pointer?: [number, number]) {
  interaction.hovered = hovered
  if (point) interaction.point = point
  if (pointer) interaction.pointer = pointer
}
