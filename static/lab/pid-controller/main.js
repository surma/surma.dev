import Matter from "https://esm.sh/matter-js@0.18.0";
const {Engine, Render, Bodies, Composite, Runner, Events} = Matter;

const {element, target, kp, kd, ki, c1: c, c2} = document.all;
const levers = {kp, ki, kd}

const engine = Engine.create();
const render = Render.create({
	element,
	engine ,
	options: {
		width: 800,
		height: 600,
		showVelocity: true
}
});

const submarine = Bodies.rectangle(400, 300, 60, 20, { frictionAir: 0.05 });
// add bodies
Composite.add(engine.world, [ submarine ]);
// run the renderer
Render.run(render);

// create runner
var runner = Runner.create();

// run the engine
Runner.run(runner, engine);

Object.assign(globalThis, {
	desiredHeight: 0,
	weights: {
		kp: 0,
		ki: 0,
		kd: 0,
	},
	submarine
});

function getInputSpan(input) {
	return input.closest("label").querySelector(".output");
}

let integral = 0;
let lastError = 0;
function update() {
	integral = 0;
	getInputSpan(target).textContent = target.value
	desiredHeight = target.valueAsNumber;
	Object.entries(levers).forEach(([name, input]) => {
		getInputSpan(input).textContent = input.value;
		weights[name] = input.valueAsNumber;
	});
}
update();

target.addEventListener("input", update);
Object.entries(levers).forEach(([name, input]) => {
	input.addEventListener("input", update);
});


const ctx = c.getContext("2d");
const ctx2 = c2.getContext("2d");

let lastPosition = 0;
Events.on(runner, "beforeUpdate", async (ev) => {
	const {delta} = ev.source;

	const error = desiredHeight - submarine.position.y
	integral += error;
	const differential = (error - lastError)/delta;

	submarine.force.y = weights.kp * error + weights.kd * differential + weights.ki * integral;

	ctx.beginPath();
	ctx.moveTo(ctx.canvas.width - 2, lastPosition);
	ctx.lineTo(ctx.canvas.width - 1, submarine.position.y);
	ctx.stroke();
	lastPosition = submarine.position.y;
	// Turn canvas into a bitmap and repaint it one pixel to the left
	const bitmap = await createImageBitmap(ctx.canvas);
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.drawImage(bitmap, -1, 0);

	// ctx.fillStyle = 'red';
	// ctx.fillRect(0, 0, 50, 50);
	ctx2.clearRect(0, 0, ctx2.canvas.width, ctx.canvas.height);
	ctx2.strokeStyle = 'red';
	ctx2.beginPath();
	ctx2.moveTo(0, desiredHeight);
	ctx2.lineTo(ctx2.canvas.width, desiredHeight);
	ctx2.stroke();
})

