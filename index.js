const video5 = document.getElementsByClassName('input_video5')[0];
const out5 = document.getElementsByClassName('output5')[0];
const controlsElement5 = document.getElementsByClassName('control5')[0];
const squatCountElement = document.getElementsByClassName('squat-counter')[0];
const canvasCtx5 = out5.getContext('2d');

const fpsControl = new FPS();

const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

function zColor(data) {
  const z = clamp(data.from.z + 0.5, 0, 1);
  return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}

function onResultsPose(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx5.save();
  canvasCtx5.clearRect(0, 0, out5.width, out5.height);
  canvasCtx5.drawImage(
    results.image, 0, 0, out5.width, out5.height);

  // ---- Draw pose landmarks.
  drawConnectors(
    canvasCtx5, results.poseLandmarks, POSE_CONNECTIONS, {
    color: (data) => {
      const x0 = out5.width * data.from.x;
      const y0 = out5.height * data.from.y;
      const x1 = out5.width * data.to.x;
      const y1 = out5.height * data.to.y;

      const z0 = clamp(data.from.z + 0.5, 0, 1);
      const z1 = clamp(data.to.z + 0.5, 0, 1);

      const gradient = canvasCtx5.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(
        0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
      gradient.addColorStop(
        1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
      return gradient;
    }
  });
  drawLandmarks(
    canvasCtx5,
    Object.values(POSE_LANDMARKS_LEFT)
      .map(index => results.poseLandmarks[index]),
    { color: zColor, fillColor: '#FF0000' });
  drawLandmarks(
    canvasCtx5,
    Object.values(POSE_LANDMARKS_RIGHT)
      .map(index => results.poseLandmarks[index]),
    { color: zColor, fillColor: '#00FF00' });
  drawLandmarks(
    canvasCtx5,
    Object.values(POSE_LANDMARKS_NEUTRAL)
      .map(index => results.poseLandmarks[index]),
    { color: zColor, fillColor: '#AAAAAA' });
  canvasCtx5.restore();


  // ---- SQUAT DETECTION ---
  squatDetection(results)
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
  }
});
pose.onResults(onResultsPose);

const camera = new Camera(video5, {
  onFrame: async () => {
    await pose.send({ image: video5 });
  },
  width: 480,
  height: 480
});
camera.start();

new ControlPanel(controlsElement5, {
  selfieMode: true,
  upperBodyOnly: false,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
})
  .add([
    new StaticText({ title: 'MediaPipe Pose' }),
    fpsControl,
    new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new Toggle({ title: 'Upper-body Only', field: 'upperBodyOnly' }),
    new Toggle({ title: 'Smooth Landmarks', field: 'smoothLandmarks' }),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  .on(options => {
    video5.classList.toggle('selfie', options.selfieMode);
    pose.setOptions(options);
  });



  function calculateAngle(point1, point2, point3) {
    const angleRadians =
        Math.atan2(point3.y - point2.y, point3.x - point2.x) -
        Math.atan2(point1.y - point2.y, point1.x - point2.x);
    let angleDegrees = (angleRadians * 180.0) / Math.PI;

    if(angleDegrees > 180.0) {
      angleDegrees = 360 - angleDegrees;
    }
    return angleDegrees;
  }
  let squatCounter = 0
  
  let squatDetected = false;
  let stage = "";
  
  var squatDetection = function(results) {
        //  console.log(results);

        // let squatDetected = false;
        const landmarks = results.poseLandmarks;
        // console.log(landmarks);
        if (landmarks) {
            const leftHip = landmarks[23];
            const leftKnee = landmarks[25];
            const leftAnkle = landmarks[27];

            const rightHip = landmarks[24];
            const rightKnee = landmarks[26];
            const rightAnkle = landmarks[28 ];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
  

            // Knee joint angles
            let leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
            leftKneeAngle = Math.round((leftKneeAngle + Number.EPSILON) * 100) / 100
            let rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
            rightKneeAngle = Math.round((rightKneeAngle + Number.EPSILON) * 100) / 100
            console.log("leftKneeAngle", leftKneeAngle);
            console.log("rightKneeAngle", rightKneeAngle);


            // shoulder hip knee angle
            let lefthipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
            lefthipAngle = Math.round((lefthipAngle + Number.EPSILON) * 100) / 100
            let righthipAngle = calculateAngle(rightShoulder, rightHip,rightKnee);
            righthipAngle = Math.round((righthipAngle + Number.EPSILON) * 100) / 100
            console.log("lefthipAngle", lefthipAngle);
            console.log("righthipAngle", righthipAngle);

            if(leftKneeAngle > 169 && rightKneeAngle > 169 && lefthipAngle > 100 && righthipAngle> 100){
              stage = "UP";
            }else if(leftKneeAngle <= 90 && rightKneeAngle <= 90 && lefthipAngle <= 100 && righthipAngle <= 100 && stage == "UP" ){
              stage = "DOWN";
              squatCounter++;
              squatCountElement.textContent = `Squat Count: ${squatCounter}`;
            }

        //     // Detect a squat if both legs bend at a certain angle
        //     if (leftLegAngle > 160 && rightLegAngle > 160) {
        //         if (!squatDetected) {
        //             squatDetected = true;
        //             squatCounter++;
        //             squatCountElement.textContent = `Squat Count: ${squatCounter}`;
        //         }
        //     } else {
        //         squatDetected = false;
        //     }
        // }else{
        //   squatDetected = false;
        // }

        // requestAnimationFrame(drawSquatDetection);
        }
  }