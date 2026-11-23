export interface DrawExclusion {
  giverId: string;
  excludedReceiverId: string;
}

export interface DrawAssignment {
  giverId: string;
  receiverId: string;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates a valid derangement for Secret Santa:
 * - Minimum 3 participants
 * - No self-draws (giver !== receiver)
 * - Respects directed exclusions (giver -> excludedReceiverId)
 * - For 4+ participants, avoids reciprocal pairs (A -> B and B -> A) whenever possible
 */
export function computeDrawAssignments(
  participantIds: string[],
  exclusions: DrawExclusion[]
): DrawAssignment[] {
  const n = participantIds.length;
  if (n < 3) {
    throw new Error(
      "São necessários pelo menos 3 participantes ativos para realizar o sorteio."
    );
  }

  const excludedMap = new Map<string, Set<string>>();
  for (const id of participantIds) {
    excludedMap.set(id, new Set([id]));
  }
  for (const ex of exclusions) {
    excludedMap.get(ex.giverId)?.add(ex.excludedReceiverId);
  }

  const attempt = (avoidReciprocal: boolean): DrawAssignment[] | null => {
    // Order givers by fewest valid candidates first (MRV heuristic) for fast backtracking
    const givers = shuffleArray(participantIds).sort((a, b) => {
      const candA = n - (excludedMap.get(a)?.size ?? 1);
      const candB = n - (excludedMap.get(b)?.size ?? 1);
      return candA - candB;
    });

    const usedReceivers = new Set<string>();
    const assignedReceiverOf = new Map<string, string>();

    function backtrack(index: number): boolean {
      if (index === givers.length) {
        return true;
      }

      const giver = givers[index];
      const blocked = excludedMap.get(giver) ?? new Set([giver]);

      const candidates = shuffleArray(
        participantIds.filter((candidate) => {
          if (blocked.has(candidate)) return false;
          if (usedReceivers.has(candidate)) return false;
          if (
            avoidReciprocal &&
            n >= 4 &&
            assignedReceiverOf.get(candidate) === giver
          ) {
            return false;
          }
          return true;
        })
      );

      for (const receiver of candidates) {
        usedReceivers.add(receiver);
        assignedReceiverOf.set(giver, receiver);

        if (backtrack(index + 1)) {
          return true;
        }

        usedReceivers.delete(receiver);
        assignedReceiverOf.delete(giver);
      }

      return false;
    }

    if (!backtrack(0)) return null;

    return givers.map((giverId) => ({
      giverId,
      receiverId: assignedReceiverOf.get(giverId)!,
    }));
  };

  // First try strictly avoiding reciprocal pairs (when n >= 4)
  const strict = attempt(true);
  if (strict) return strict;

  // Fallback: if heavy exclusions make a non-reciprocal cycle impossible, still respect all exclusions
  const relaxed = attempt(false);
  if (relaxed) return relaxed;

  throw new Error(
    "Não foi possível gerar o sorteio com as restrições atuais. Remova alguma restrição e tente novamente."
  );
}
