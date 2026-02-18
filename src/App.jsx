import React, { useState, useCallback, useRef } from 'react';
import SingleVarGraph from './components/SingleVarGraph';
import './App.css';

const SIMPLE_OPERATORS = ['>', '<', '\u2265', '\u2264'];

const OPERATOR_DISPLAY = {
  '>': '>',
  '<': '<',
  '\u2265': '\u2265',
  '\u2264': '\u2264',
};

/* ------------------------------------------------------------------ */
/*  Question generation                                               */
/* ------------------------------------------------------------------ */

function generateInequality() {
  const isCompound = Math.random() < 0.5;

  if (!isCompound) {
    const boundary = Math.floor(Math.random() * 11) - 5;
    const operator =
      SIMPLE_OPERATORS[Math.floor(Math.random() * SIMPLE_OPERATORS.length)];
    return { type: 'single', boundary, operator };
  }

  let a, b;
  do {
    a = Math.floor(Math.random() * 11) - 5;
    b = Math.floor(Math.random() * 11) - 5;
  } while (a >= b);

  const leftOp = Math.random() < 0.5 ? '<' : '\u2264';
  const rightOp = Math.random() < 0.5 ? '<' : '\u2264';

  return { type: 'compound', a, b, leftOp, rightOp };
}

function getInequalityText(inequality) {
  if (inequality.type === 'compound') {
    return `${inequality.a} ${OPERATOR_DISPLAY[inequality.leftOp]} x ${OPERATOR_DISPLAY[inequality.rightOp]} ${inequality.b}`;
  }
  return `x ${OPERATOR_DISPLAY[inequality.operator]} ${inequality.boundary}`;
}

/* ------------------------------------------------------------------ */
/*  Grading & Socratic feedback system                                */
/* ------------------------------------------------------------------ */

function computeExpectedSolution(inequalityString) {
  const normalized = inequalityString
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=');

  const compoundMatch = normalized.match(
    /(-?\d+)\s*(<=|<)\s*x\s*(<=|<)\s*(-?\d+)/
  );
  if (compoundMatch) {
    const a = parseInt(compoundMatch[1], 10);
    const leftOp = compoundMatch[2];
    const rightOp = compoundMatch[3];
    const b = parseInt(compoundMatch[4], 10);
    const leftCircle = leftOp === '<' ? 'open' : 'closed';
    const rightCircle = rightOp === '<' ? 'open' : 'closed';
    return { type: 'compound', leftBoundary: a, rightBoundary: b, leftCircle, rightCircle };
  }

  const singleMatch = normalized.match(/x\s*(>=|<=|>|<)\s*(-?\d+)/);
  if (singleMatch) {
    const operator = singleMatch[1];
    const boundaryValue = parseInt(singleMatch[2], 10);
    const circleType = (operator === '>' || operator === '<') ? 'open' : 'closed';
    const shadingDirection = (operator === '>' || operator === '>=') ? 'right' : 'left';
    return { type: 'single', boundaryValue, circleType, shadingDirection, operator };
  }

  return null;
}

function gradeStudentResponse(student, expected) {
  if (student.type !== expected.type) {
    return {
      isCorrect: false,
      typeMismatch: true,
      expectedType: expected.type,
      studentType: student.type,
    };
  }

  if (expected.type === 'single') {
    const errors = {
      boundary: student.boundaryValue !== expected.boundaryValue,
      circle: student.circleType !== expected.circleType,
      shading: student.shadingDirection !== expected.shadingDirection,
    };
    return {
      isCorrect: !errors.boundary && !errors.circle && !errors.shading,
      typeMismatch: false,
      errors,
    };
  }

  const errors = {
    leftBoundary: student.leftBoundary !== expected.leftBoundary,
    rightBoundary: student.rightBoundary !== expected.rightBoundary,
    leftCircle: student.leftCircle !== expected.leftCircle,
    rightCircle: student.rightCircle !== expected.rightCircle,
  };
  const isCorrect =
    !errors.leftBoundary && !errors.rightBoundary &&
    !errors.leftCircle && !errors.rightCircle;
  return { isCorrect, typeMismatch: false, errors };
}

/* ------------------------------------------------------------------ */
/*  Socratic feedback – dispatcher                                    */
/* ------------------------------------------------------------------ */

function generateSocraticFeedback(inequalityString, student, expected, grade) {
  if (grade.isCorrect) {
    return ['Answer Correct.'];
  }

  if (grade.typeMismatch) {
    return generateTypeMismatchFeedback(inequalityString, grade);
  }

  if (expected.type === 'single') {
    return generateSingleFeedback(inequalityString, expected, grade);
  }

  return generateCompoundFeedback(inequalityString, student, expected, grade);
}

/* ------------------------------------------------------------------ */
/*  Socratic feedback – type mismatch                                 */
/* ------------------------------------------------------------------ */

function generateTypeMismatchFeedback(inequalityString, grade) {
  const lines = [];
  if (grade.expectedType === 'compound') {
    lines.push(
      `Take another look at the inequality ${inequalityString}. Notice that x is between two values \u2014 this is a compound inequality.`
    );
    lines.push(
      `You\u2019ll need to place a circle at each boundary value and shade the region between them.`
    );
  } else {
    lines.push(
      `The inequality ${inequalityString} compares x to just one value \u2014 it\u2019s not a compound inequality.`
    );
    lines.push(
      `You only need one boundary circle and shading in one direction (left or right).`
    );
  }
  lines.push(`Revise your graph and press Submit again.`);
  return lines;
}

/* ------------------------------------------------------------------ */
/*  Socratic feedback – single inequality                             */
/* ------------------------------------------------------------------ */

function generateSingleFeedback(inequalityString, expected, grade) {
  const { errors } = grade;
  const b = expected.boundaryValue;
  const boundaryOk = !errors.boundary;
  const circleOk = !errors.circle;
  const shadingOk = !errors.shading;
  const lines = [];

  if (!circleOk && boundaryOk && shadingOk) {
    lines.push(
      `Nice work \u2014 you placed the boundary at ${b} and shaded in the correct direction.`
    );
    lines.push(
      `Now think about whether ${b} itself is included in the solution set.`
    );
    lines.push(
      `Try substituting x = ${b} into the inequality ${inequalityString}. Does it make a true statement?`
    );
    lines.push(
      `If the boundary value is included, what type of circle represents inclusion on a number line?`
    );
    lines.push(`Update the circle type and press Submit again.`);
    return lines;
  }

  if (!shadingOk && boundaryOk && circleOk) {
    lines.push(
      `Good \u2014 you identified the boundary value ${b} and chose the correct circle type.`
    );
    lines.push(
      `Now consider: which values of x satisfy ${inequalityString}? Are they greater than or less than ${b}?`
    );
    lines.push(
      `On a number line, are those values to the left or to the right of ${b}?`
    );
    lines.push(
      `Remember: \u201Cgreater than\u201D means shade to the right, and \u201Cless than\u201D means shade to the left.`
    );
    lines.push(`Adjust the shading direction and press Submit again.`);
    return lines;
  }

  if (errors.boundary) {
    if (circleOk && shadingOk) {
      lines.push(
        `Your circle type and shading direction look right \u2014 nice job on those.`
      );
    } else if (circleOk) {
      lines.push(`You chose the correct circle type \u2014 that\u2019s a good start.`);
    } else if (shadingOk) {
      lines.push(`The shading direction looks correct \u2014 that\u2019s a good start.`);
    }
    lines.push(`Take another look at the boundary value you placed on the number line.`);
    lines.push(
      `In the inequality ${inequalityString}, what number is being compared to x?`
    );
    if (b < 0) {
      lines.push(
        `Be careful with negatives \u2014 make sure the sign of your boundary matches the inequality.`
      );
    }
    lines.push(`Move the boundary point to the correct value and press Submit again.`);
    return lines;
  }

  lines.push(`You placed the boundary at ${b} \u2014 that\u2019s correct.`);
  lines.push(
    `Let\u2019s focus on the direction first. Which values of x satisfy ${inequalityString}?`
  );
  lines.push(
    `Are the solutions to the left or to the right of ${b} on the number line?`
  );
  lines.push(
    `Also, think about whether ${b} itself is part of the solution. Should the circle be open or filled?`
  );
  lines.push(`Revise your graph and press Submit again.`);
  return lines;
}

/* ------------------------------------------------------------------ */
/*  Socratic feedback – compound inequality                           */
/* ------------------------------------------------------------------ */

function generateCompoundFeedback(inequalityString, student, expected, grade) {
  const { errors } = grade;
  const a = expected.leftBoundary;
  const b = expected.rightBoundary;
  const leftBoundaryOk = !errors.leftBoundary;
  const rightBoundaryOk = !errors.rightBoundary;
  const leftCircleOk = !errors.leftCircle;
  const rightCircleOk = !errors.rightCircle;
  const bothBoundariesOk = leftBoundaryOk && rightBoundaryOk;
  const bothCirclesOk = leftCircleOk && rightCircleOk;
  const lines = [];

  // Both boundaries correct, one or both circles wrong
  if (bothBoundariesOk && !bothCirclesOk) {
    lines.push(
      `You identified both boundary values (${a} and ${b}) correctly \u2014 nice work.`
    );

    if (leftCircleOk && !rightCircleOk) {
      lines.push(`The circle at ${a} is correct.`);
      lines.push(
        `Now think about the circle at ${b}. Is ${b} itself included in the solution?`
      );
      lines.push(
        `Try substituting x = ${b} into ${inequalityString}. Does it make a true statement?`
      );
    } else if (rightCircleOk && !leftCircleOk) {
      lines.push(`The circle at ${b} is correct.`);
      lines.push(
        `Now think about the circle at ${a}. Is ${a} itself included in the solution?`
      );
      lines.push(
        `Try substituting x = ${a} into ${inequalityString}. Does it make a true statement?`
      );
    } else {
      lines.push(
        `Now consider each boundary: is it included in the solution set or not?`
      );
      lines.push(
        `Try substituting x = ${a} and x = ${b} into ${inequalityString}. Which make true statements?`
      );
      lines.push(
        `Included boundaries use a filled circle; excluded boundaries use an open circle.`
      );
    }

    lines.push(`Update the circle type(s) and press Submit again.`);
    return lines;
  }

  // One or both boundaries wrong (highest priority)
  if (!bothBoundariesOk) {
    const correctParts = [];
    if (leftBoundaryOk) correctParts.push(`the left boundary at ${a}`);
    if (rightBoundaryOk) correctParts.push(`the right boundary at ${b}`);
    if (leftBoundaryOk && leftCircleOk) correctParts.push(`the circle type at ${a}`);
    if (rightBoundaryOk && rightCircleOk) correctParts.push(`the circle type at ${b}`);

    if (correctParts.length > 0) {
      lines.push(
        `You got ${correctParts.join(' and ')} correct \u2014 that\u2019s a good start.`
      );
    }

    lines.push(
      `Read the inequality ${inequalityString} carefully. What are the two numbers that x is between?`
    );

    if ((a < 0 || b < 0) && (!leftBoundaryOk || !rightBoundaryOk)) {
      lines.push(
        `Be careful with negative values \u2014 check the signs of both boundary numbers.`
      );
    }

    lines.push(
      `Place a circle at each boundary value and shade the region between them.`
    );
    lines.push(`Revise your graph and press Submit again.`);
    return lines;
  }

  // Fallback (both boundaries and circles correct shouldn't reach here)
  lines.push(`Almost there! Double-check your work and press Submit again.`);
  return lines;
}

/* ------------------------------------------------------------------ */
/*  Applet state interpretation                                       */
/* ------------------------------------------------------------------ */

function interpretGraphState(graphState) {
  if (!graphState) return null;

  const { segments, emptyCircleTicks, filledCircleTicks } = graphState;
  const totalCircles = emptyCircleTicks.length + filledCircleTicks.length;

  // Single inequality: exactly 1 circle + at least 1 segment
  if (totalCircles === 1 && segments.length > 0) {
    let circleType = null;
    let boundaryValue = null;

    if (emptyCircleTicks.length === 1) {
      circleType = 'open';
      boundaryValue = emptyCircleTicks[0];
    } else {
      circleType = 'closed';
      boundaryValue = filledCircleTicks[0];
    }

    let shadingDirection = null;
    for (const seg of segments) {
      const leftVal = Math.min(seg.startValue, seg.endValue);
      const rightVal = Math.max(seg.startValue, seg.endValue);
      if (rightVal > boundaryValue + 0.5) shadingDirection = 'right';
      if (leftVal < boundaryValue - 0.5) shadingDirection = 'left';
    }

    if (!shadingDirection) return null;
    return { type: 'single', boundaryValue, circleType, shadingDirection };
  }

  // Compound inequality: exactly 2 circles + at least 1 segment
  if (totalCircles === 2 && segments.length > 0) {
    const circles = [];
    for (const tick of emptyCircleTicks) {
      circles.push({ value: tick, circleType: 'open' });
    }
    for (const tick of filledCircleTicks) {
      circles.push({ value: tick, circleType: 'closed' });
    }
    circles.sort((c1, c2) => c1.value - c2.value);

    return {
      type: 'compound',
      leftBoundary: circles[0].value,
      rightBoundary: circles[1].value,
      leftCircle: circles[0].circleType,
      rightCircle: circles[1].circleType,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  App component                                                     */
/* ------------------------------------------------------------------ */

function App() {
  const [inequality, setInequality] = useState(() => generateInequality());
  const [feedback, setFeedback] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [questionKey, setQuestionKey] = useState(0);
  const graphStateRef = useRef(null);

  const handleStateChange = useCallback((state) => {
    graphStateRef.current = state;
  }, []);

  const advanceToNextQuestion = useCallback(() => {
    setInequality(generateInequality());
    setFeedback(null);
    setIsCorrect(null);
    graphStateRef.current = null;
    setQuestionKey((k) => k + 1);
  }, []);

  const inequalityText = getInequalityText(inequality);

  const handleSubmit = () => {
    const studentAnswer = interpretGraphState(graphStateRef.current);
    const expected = computeExpectedSolution(inequalityText);

    if (!studentAnswer) {
      setIsCorrect(false);
      if (expected && expected.type === 'compound') {
        setFeedback([
          'Your graph isn\u2019t complete yet. This is a compound inequality \u2014 x is between two values.',
          `What are the two boundary numbers in ${inequalityText}? Place a circle at each one, then shade the region between them.`,
          'Try again and press Submit.',
        ]);
      } else {
        setFeedback([
          'Your graph isn\u2019t complete yet. Make sure you\u2019ve placed exactly one circle (open or filled) on a boundary value and drawn a shaded region in one direction.',
          'What is the boundary value in the inequality? Place a circle there, then shade the side that represents the solution.',
          'Try again and press Submit.',
        ]);
      }
      return;
    }

    const grade = gradeStudentResponse(studentAnswer, expected);
    const feedbackLines = generateSocraticFeedback(
      inequalityText, studentAnswer, expected, grade
    );

    setIsCorrect(grade.isCorrect);
    setFeedback(feedbackLines);
  };

  return (
    <div className="app-container">
      <div className="prompt-section">
        <p className="prompt-label">Graph the following inequality:</p>
        <p className="inequality-display">{inequalityText}</p>
      </div>

      <div className="graph-wrapper">
        <SingleVarGraph key={questionKey} onStateChange={handleStateChange} />
      </div>

      {isCorrect ? (
        <button className="submit-btn next-btn" onClick={advanceToNextQuestion}>
          Next Question
        </button>
      ) : (
        <button className="submit-btn" onClick={handleSubmit}>
          Submit
        </button>
      )}

      {feedback && (
        <div className={`feedback-area ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
          {feedback.map((msg, i) => (
            <p key={i} className="feedback-message">{msg}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
