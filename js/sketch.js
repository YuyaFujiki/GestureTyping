function getHandPosition(landmarks) {
  if (!landmarks || landmarks.length === 0) {
    return "";
  }

  let sumY = 0;
  for (const landmark of landmarks) {
    sumY += landmark.y;
  }

  const centerY = sumY / landmarks.length;
  if (centerY < 1 / 3) {
    return "top";
  }
  if (centerY < 2 / 3) {
    return "middle";
  }
  return "bottom";
}

function getMappedCharacter(handedness, gesture, landmarks) {
  const position = getHandPosition(landmarks);
  const table = {
    Left: {
      oya: { top: "t", middle: "g", bottom: "b" },
      hito: { top: "r", middle: "f", bottom: "v" },
      naka: { top: "e", middle: "d", bottom: "c" },
      kusu: { top: "w", middle: "s", bottom: "x" },
      ko: { top: "q", middle: "a", bottom: "z" },
    },
    Right: {
      oya: { top: "y", middle: "h", bottom: "n" },
      hito: { top: "u", middle: "j", bottom: "m" },
      naka: { top: "i", middle: "k", bottom: "" },
      kusu: { top: "o", middle: "l", bottom: "" },
      ko: { top: "p", middle: " ", bottom: "backspace" },
    },
  };

  if (!table[handedness] || !table[handedness][gesture] || !position) {
    return "";
  }

  return table[handedness][gesture][position] || "";
}

function getCharacter(results) {
  const handednesses = results.handednesses || results.handedness || [];

  if (results.gestures.length < 2 || handednesses.length < 2 || results.landmarks.length < 2) {
    return "";
  }

  const hands = results.gestures.map((gestureList, index) => {
    const handedness = handednesses[index]?.[0]?.categoryName || "";
    const gesture = gestureList?.[0]?.categoryName || "";
    const score = gestureList?.[0]?.score || 0;
    const landmarks = results.landmarks[index] || [];

    return {
      handedness,
      gesture,
      score,
      character: getMappedCharacter(handedness, gesture, landmarks),
    };
  });

  const leftHand = hands.find((hand) => hand.handedness === "Left");
  const rightHand = hands.find((hand) => hand.handedness === "Right");

  if (leftHand?.gesture === "oya" && rightHand?.gesture === "oya") {
    return "";
  }

  const candidates = hands
    .filter((hand) => hand.character)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.character || "";
}

// 入力サンプル文章 
let sample_texts = [
  "the quick brown fox jumps over the lazy dog",
];

// ゲームの状態を管理する変数
// notready: ゲーム開始前 （カメラ起動前）
// ready: ゲーム開始前（カメラ起動後）
// playing: ゲーム中
// finished: ゲーム終了後
// ready, playing, finished
let game_mode = {
  now: "notready",
  previous: "notready",
};

let game_start_time = 0;
let gestures_results;
let cam = null;
let p5canvas = null;

function setup() {
  p5canvas = createCanvas(320, 240);
  p5canvas.parent('#canvas');

  // When gestures are found, the following function is called. The detection results are stored in results.
  let lastCommittedSignature = "";
  let stableGestureSignature = "";
  let stableGestureCount = 0;
  let lastInputTime = 0;
  const inputIntervalMs = 180;
  const kusuInputIntervalMs = 90;
  const stableFrameThreshold = 2;
  const kusuStableFrameThreshold = 1;

  function resetGestureTracking() {
    stableGestureSignature = "";
    stableGestureCount = 0;
  }

  gotGestures = function (results) {
    gestures_results = results;

    if (results.gestures.length == 2) {
      if (game_mode.now == "ready" && game_mode.previous == "notready") {
        // ゲーム開始前の状態から、カメラが起動した後の状態に変化した場合
        game_mode.previous = game_mode.now;
        game_mode.now = "playing";
        document.querySelector('input').value = ""; // 入力欄をクリア
        game_start_time = millis(); // ゲーム開始時間を記録
        lastCommittedSignature = "";
        lastInputTime = 0;
        resetGestureTracking();
      }
      const handednesses = results.handednesses || results.handedness || [];
      const leftHandIndex = handednesses.findIndex((handedness) => handedness?.[0]?.categoryName === "Left");
      const rightHandIndex = handednesses.findIndex((handedness) => handedness?.[0]?.categoryName === "Right");
      const leftGesture = leftHandIndex >= 0 ? (results.gestures[leftHandIndex]?.[0]?.categoryName || "") : "";
      const rightGesture = rightHandIndex >= 0 ? (results.gestures[rightHandIndex]?.[0]?.categoryName || "") : "";
      const isKusuGesture = leftGesture === "kusu" || rightGesture === "kusu";
      const effectiveInputIntervalMs = isKusuGesture ? kusuInputIntervalMs : inputIntervalMs;
      const effectiveStableFrameThreshold = isKusuGesture ? kusuStableFrameThreshold : stableFrameThreshold;

      if (!leftGesture || !rightGesture) {
        resetGestureTracking();
        return;
      }

      const signature = `${leftGesture}|${rightGesture}`;
      let c = getCharacter(results);

      let now = millis();
      if (signature !== stableGestureSignature) {
        stableGestureSignature = signature;
        stableGestureCount = 1;
        return;
      }

      stableGestureCount += 1;
      if (stableGestureCount < effectiveStableFrameThreshold) {
        return;
      }

      if (signature === lastCommittedSignature) {
        return;
      }

      if (now - lastInputTime > effectiveInputIntervalMs) {
        typeChar(c);
        lastCommittedSignature = signature;
        lastInputTime = now;
      }
    }

  }
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ここから下は課題制作にあたって編集してはいけません。
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// 入力欄に文字を追加する場合は必ずこの関数を使用してください。
function typeChar(c) {
  if (c === "") {
    console.warn("Empty character received, ignoring.");
    return;
  }
  // inputにフォーカスする
  document.querySelector('input').focus();
  // 入力欄に文字を追加または削除する関数
  const input = document.querySelector('input');
  if (c === "backspace") {
    input.value = input.value.slice(0, -1);
  } else {
    input.value += c;
  }

  let inputValue = input.value;
  // #messageのinnerTextを色付けして表示
  const messageElem = document.querySelector('#message');
  const target = messageElem.innerText;
  let matchLen = 0;
  for (let i = 0; i < Math.min(inputValue.length, target.length); i++) {
    if (inputValue[i] === target[i]) {
      matchLen++;
    } else {
      break;
    }
  }
  const matched = target.slice(0, matchLen);
  const unmatched = target.slice(matchLen);
  console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
  messageElem.innerHTML =
    `<span style="background-color:lightgreen">${matched}</span><span style="background-color:transparent">${unmatched}</span>`;




  // もしvalueの値がsample_texts[0]と同じになったら、[0]を削除して、次のサンプル文章に移行する。配列長が0になったらゲームを終了する
  if (document.querySelector('input').value == sample_texts[0]) {
    sample_texts.shift(); // 最初の要素を削除
    console.log(sample_texts.length);
    if (sample_texts.length == 0) {
      // サンプル文章がなくなったらゲーム終了
      game_mode.previous = game_mode.now;
      game_mode.now = "finished";
      document.querySelector('input').value = "";
      const elapsedSec = ((millis() - game_start_time) / 1000).toFixed(2);
      document.querySelector('#message').innerText = `Finished: ${elapsedSec} sec`;
    } else {
      // 次のサンプル文章に移行
      document.querySelector('input').value = "";
      document.querySelector('#message').innerText = sample_texts[0];
    }
  }

}


function startWebcam() {
  // If the function setCameraStreamToMediaPipe is defined in the window object, the camera stream is set to MediaPipe.
  if (window.setCameraStreamToMediaPipe) {
    cam = createCapture(VIDEO);
    cam.hide();
    cam.elt.onloadedmetadata = function () {
      window.setCameraStreamToMediaPipe(cam.elt);
    }
    p5canvas.style('width', '100%');
    p5canvas.style('height', 'auto');
  }

  if (game_mode.now == "notready") {
    game_mode.previous = game_mode.now;
    game_mode.now = "ready";
    document.querySelector('#message').innerText = sample_texts[0];
    game_start_time = millis();
  }
}


function draw() {
  background(127);
  if (cam) {
    push();
    translate(width, 0);
    scale(-1, 1);
    image(cam, 0, 0, width, height);
    pop();
  }
  // 各頂点座標を表示する
  // 各頂点座標の位置と番号の対応は以下のURLを確認
  // https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
  if (gestures_results) {
    if (gestures_results.landmarks) {
      for (const landmarks of gestures_results.landmarks) {
        for (let landmark of landmarks) {
          noStroke();
          fill(100, 150, 210);
          circle(width - (landmark.x * width), landmark.y * height, 10);
        }
      }
    }

    // ジェスチャーの結果を表示する
    for (let i = 0; i < gestures_results.gestures.length; i++) {
      noStroke();
      fill(255, 0, 0);
      textSize(10);
      let name = gestures_results.gestures[i][0].categoryName;
      let score = gestures_results.gestures[i][0].score;
      let right_or_left = gestures_results.handednesses[i][0].hand;
      let pos = {
        x: width - (gestures_results.landmarks[i][0].x * width),
        y: gestures_results.landmarks[i][0].y * height,
      };
      textSize(20);
      fill(0);
      textAlign(CENTER, CENTER);
      text(name, pos.x, pos.y);
    }
  }

  if (game_mode.now == "notready") {
    // 文字の後ろを白で塗りつぶす
    let msg = "Press the start button to begin";
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = height / 2;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }
  else if (game_mode.now == "ready") {
    let msg = "Waiting for gestures to start";
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = height / 2;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }
  else if (game_mode.now == "playing") {
    // ゲーム中のメッセージ
    let elapsedSec = ((millis() - game_start_time) / 1000).toFixed(2);
    let msg = `${elapsedSec} [s]`;
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = th;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }
  else if (game_mode.now == "finished") {
    // ゲーム終了後のメッセージ
    let msg = "Game finished!";
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = height / 2;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }

}


