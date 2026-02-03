export interface ValidationError {
  type: 'brackets' | 'index' | 'syntax' | 'operator';
  message: string;
  position?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateConditionLogic = (
  logic: string,
  conditionsCount: number
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!logic || logic.trim() === '') {
    return { isValid: true, errors: [] };
  }

  const tokens = logic.split(/\s+/).filter(t => t.length > 0);
  
  // 1. Проверка парности скобок
  let bracketStack: string[] = [];
  let bracketBalance = 0;
  
  tokens.forEach((token, idx) => {
    if (token === '(') {
      bracketStack.push(token);
      bracketBalance++;
    } else if (token === ')') {
      if (bracketStack.length === 0) {
        errors.push({
          type: 'brackets',
          message: `Лишняя закрывающая скобка в позиции ${idx}`,
          position: idx,
        });
      } else {
        bracketStack.pop();
        bracketBalance--;
      }
    }
  });

  if (bracketStack.length > 0) {
    errors.push({
      type: 'brackets',
      message: `Не закрыто скобок: ${bracketStack.length}`,
    });
  }

  // 2. Проверка индексов
  tokens.forEach((token, idx) => {
    if (!isNaN(Number(token))) {
      const index = Number(token);
      if (index < 0) {
        errors.push({
          type: 'index',
          message: `Отрицательный индекс ${index} в позиции ${idx}`,
          position: idx,
        });
      } else if (index >= conditionsCount) {
        errors.push({
          type: 'index',
          message: `Индекс ${index} выходит за границы (макс: ${conditionsCount - 1}) в позиции ${idx}`,
          position: idx,
        });
      }
    }
  });

  // 3. Проверка операторов
  const validOperators = ['AND', 'OR'];
  tokens.forEach((token, idx) => {
    if (
      token !== '(' &&
      token !== ')' &&
      isNaN(Number(token)) &&
      !validOperators.includes(token.toUpperCase())
    ) {
      errors.push({
        type: 'operator',
        message: `Неизвестный оператор "${token}" в позиции ${idx}. Используйте AND или OR`,
        position: idx,
      });
    }
  });

  // 4. Проверка синтаксиса: не должно быть двух операторов/индексов подряд
  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i];
    const next = tokens[i + 1];

    const isCurrentOperator = validOperators.includes(current.toUpperCase());
    const isNextOperator = validOperators.includes(next.toUpperCase());
    const isCurrentIndex = !isNaN(Number(current));
    const isNextIndex = !isNaN(Number(next));

    // Два оператора подряд
    if (isCurrentOperator && isNextOperator) {
      errors.push({
        type: 'syntax',
        message: `Два оператора подряд: "${current} ${next}" в позиции ${i}`,
        position: i,
      });
    }

    // Два индекса подряд без оператора
    if (isCurrentIndex && isNextIndex) {
      errors.push({
        type: 'syntax',
        message: `Два индекса подряд без оператора: "${current} ${next}" в позиции ${i}`,
        position: i,
      });
    }

    // Оператор после открывающей скобки
    if (current === '(' && isNextOperator) {
      errors.push({
        type: 'syntax',
        message: `Оператор после открывающей скобки в позиции ${i}`,
        position: i,
      });
    }

    // Оператор перед закрывающей скобкой
    if (isCurrentOperator && next === ')') {
      errors.push({
        type: 'syntax',
        message: `Оператор перед закрывающей скобкой в позиции ${i}`,
        position: i,
      });
    }
  }

  // 5. Проверка начала и конца
  if (tokens.length > 0) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (validOperators.includes(first.toUpperCase())) {
      errors.push({
        type: 'syntax',
        message: `Формула не может начинаться с оператора "${first}"`,
        position: 0,
      });
    }

    if (validOperators.includes(last.toUpperCase())) {
      errors.push({
        type: 'syntax',
        message: `Формула не может заканчиваться оператором "${last}"`,
        position: tokens.length - 1,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const getErrorTypeIcon = (type: ValidationError['type']): string => {
  switch (type) {
    case 'brackets':
      return '()';
    case 'index':
      return '#';
    case 'syntax':
      return '⚠️';
    case 'operator':
      return 'OP';
    default:
      return '!';
  }
};

export const getErrorTypeColor = (type: ValidationError['type']): string => {
  switch (type) {
    case 'brackets':
      return 'text-red-500';
    case 'index':
      return 'text-orange-500';
    case 'syntax':
      return 'text-pink-600';
    case 'operator':
      return 'text-purple-500';
    default:
      return 'text-destructive';
  }
};
