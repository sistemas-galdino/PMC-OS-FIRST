// Quais status encerram uma atividade.
//
// O código tratava `status !== "Concluída"` como sinônimo de "ainda está na
// fila", copiado em uma dúzia de lugares. Com "Não se aplica" — que também é
// estado final — cada cópia esquecida vira uma tarefa fantasma contada como
// atrasada. Este módulo é a fonte única dessa pergunta.
import type { AtividadeStatus } from "./types"

/** Estados finais: a tarefa saiu da fila, tenha sido feita ou não. */
export const STATUS_ENCERRADOS: AtividadeStatus[] = ["Concluída", "Não se aplica"]

export const estaEncerrada = (status: AtividadeStatus): boolean =>
  STATUS_ENCERRADOS.includes(status)

/**
 * "Não se aplica" encerra sem ter sido feita, então fica de fora dos dois lados
 * do percentual de conclusão: nem no numerador, nem no denominador. Contar como
 * feita inflaria o número da CS; contar como pendente puniria por uma tarefa
 * que nunca deveria existir.
 */
export const contaNaConclusao = (status: AtividadeStatus): boolean =>
  status !== "Não se aplica"
