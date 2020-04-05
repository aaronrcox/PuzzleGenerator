import noUiSlider from 'nouislider';
import 'nouislider/distribute/nouislider.css'
import wNumb from 'wnumb';

interface IVec2 {
    x: number;
    y: number;
}

class Timer {
    deltaTime: number = 0;
    startTime: number = 0;
    stopTime: number = 0;

    start() {
        this.deltaTime = 0;
        this.stopTime = 0;
        this.startTime = performance.now() / 1000;
    }
    stop() {
        this.stopTime = performance.now() / 1000;
        this.deltaTime = this.stopTime - this.startTime;
    }
}

class Vec2 implements IVec2 {
    x: number = 0;
    y: number = 0;
    constructor(vec: IVec2 = {x: 0, y: 0}) {
        this.x = vec.x;
        this.y = vec.y;
    }

    add(rhs: IVec2): Vec2 {
        return new Vec2({
            x: this.x + rhs.x,
            y: this.y + rhs.y
        });
    }

    addEqual(rhs: IVec2): Vec2 {
        this.x += rhs.x;
        this.y += rhs.y;
        return this;
    }

    sub(rhs: IVec2): Vec2 {
        return new Vec2({
            x: this.x - rhs.x,
            y: this.y - rhs.y
        });
    }

    subEqual(rhs: IVec2): Vec2 {
        this.x -= rhs.x;
        this.y -= rhs.y;
        return this;
    }

    mul(rhs: IVec2): Vec2 {
        return new Vec2({
            x: this.x * rhs.x,
            y: this.y * rhs.y
        });
    }

    mulEqual(rhs: IVec2): Vec2 {
        this.x *= rhs.x;
        this.y *= rhs.y;
        return this;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalise(): Vec2 {
        const length = this.length();
        return new Vec2({
            x: this.x / length,
            y: this.y / length
        });
    }

    pivot(rot: number) {
        let {x, y} = this;
        this.x = (x * Math.cos(rot)) - (y * Math.sin(rot));
        this.y = (y * Math.cos(rot)) + (x * Math.sin(rot));
        return this;
    }
}

class Path {
    points: Vec2[];
    constructor(points: IVec2[]) {
        this.points = points.map(p => new Vec2(p));
    }

    toSpline(): Spline {
        return new Spline(this.points);
    }
}

class Spline {
    points: Vec2[];
    constructor(points: IVec2[]) {
        this.points = [points[0], points[0], ...points, points[points.length-1], points[points.length-1]]
            .map(p => new Vec2(p));
    }

    getPoint(t: number): Vec2 {

        const p1 = Math.floor(t) + 1;
        const p2 = p1 + 1;
        const p3 = p2 + 1;
        const p0 = p1 - 1;

        t = t - Math.floor(t);

        const tt = t * t;
        const ttt = tt * t;

        const q1 = -ttt + 2*tt - t;
        const q2 = 3*ttt - 5*tt + 2;
        const q3 = -3*ttt + 4*tt + t;
        const q4 = ttt - tt;

        const x = 0.5 * (this.points[p0].x * q1 + this.points[p1].x * q2 + this.points[p2].x * q3 + this.points[p3].x * q4);
        const y = 0.5 * (this.points[p0].y * q1 + this.points[p1].y * q2 + this.points[p2].y * q3 + this.points[p3].y * q4);

        return new Vec2({x, y});
    }

    toPath(step: number): Path {
        const points: Vec2[] = [];
        for (let t=0; t < this.points.length - 3; t += step){
            points.push( this.getPoint(t) );
        }
        return new Path(points);
    }
}

class MouseInput {
    
    pos: Vec2 = new Vec2();
    dt: Vec2 = new Vec2();
    leftButtonDown: boolean = false;

    constructor(private canvas: HTMLCanvasElement) {
        this.canvas.addEventListener("mousedown", this.mouseDownEventHandler);
        this.canvas.addEventListener("mousemove", this.mouseMoveEventHandler);
        this.canvas.addEventListener("mouseup", this.mouseUpEventHandler);
    }

    update() {
        this.dt = new Vec2();
    }

    private mouseDownEventHandler = (e: MouseEvent) => {
        this.leftButtonDown = true;
        console.log('mouse down');
    }

    private mouseMoveEventHandler = (e: MouseEvent) => {

        const area = this.canvas.getBoundingClientRect();

        const lastPos = new Vec2(this.pos);
        this.pos.x = e.pageX - area.x;
        this.pos.y = e.pageY - area.y;
        this.dt = this.pos.sub(lastPos);
    }
    private mouseUpEventHandler = () => {
        this.leftButtonDown = false;
        console.log('mouse released');
    }
}

class InputManager {

    mouse: MouseInput;

    constructor(private canvas: HTMLCanvasElement) {
        this.mouse = new MouseInput(canvas);
    }
}

class GameObject
{
    pos: Vec2;
    mouseOver: boolean = false;
    draging: boolean = false;
    dragStartOffset: Vec2 = new Vec2();

    static mouseOverTarget: GameObject = null;
    static dragTarget: GameObject = null;
    static objects: GameObject[] = [];

    constructor(public app: App) { 
        GameObject.objects.push(this);
    }

    update(dt: number) {
       this.updateMouseState();
       this.updateDragState();
    }
    draw(context: CanvasRenderingContext2D) {}

    focus() {
        GameObject.objects = GameObject.objects.filter(z => z != this);
        GameObject.objects.unshift(this);
    }

    isPointInObbject(point: Vec2) { return false; }

    private updateMouseState() {
        const mouseInput = this.app.input.mouse;
        const mousePos = mouseInput.pos;
        
        this.mouseOver = this.isPointInObbject(mousePos);
        if(this.mouseOver && GameObject.mouseOverTarget == null){
            GameObject.mouseOverTarget = this;
        }
    }

    private updateDragState() {
        const mouseInput = this.app.input.mouse;
        const mousePos = mouseInput.pos;
        
        
        const draging = this.mouseOver && mouseInput.leftButtonDown && 
            (GameObject.dragTarget === this || GameObject.dragTarget === null);

        if (!this.draging && draging) {
            GameObject.dragTarget = this;
            this.dragStartOffset = this.pos.sub(mousePos);
            this.draging = draging;
            this.onDragStart();
        }
        else if(this.draging && !draging) {
            this.draging = draging;
            this.dragStartOffset = new Vec2();
            GameObject.dragTarget = null;
            this.onDragEnd();
        }

        if(this.draging) {
            this.onDragMove( this.dragStartOffset.add(mousePos) );
        }
    }

    protected onMouseEnter() {}
    protected onMouseExit() { }
    protected onDragStart() { }
    protected onDragEnd() { }
    protected onDragMove(newPos: Vec2) { }
}

class PuzzlePieceEdge {
    points: Vec2[] = [];
    offset: Vec2 = new Vec2();

    constructor(points: IVec2[], offset: IVec2) {
        this.points = points.map(p => new Vec2(p));
        this.offset = new Vec2(offset);
    }
}

class PuzzlePiece extends GameObject {
    
    shapePath: Vec2[] = [];

    constructor(app: App, public background: HTMLImageElement, public bgPos: Vec2, public pos: Vec2, public edges: PuzzlePieceEdge[]) {
        super(app);

        for(const edge of this.edges) {
            for(const point of edge.points){
                this.shapePath.push(new Vec2({
                    x: point.x + edge.offset.x,
                    y: point.y + edge.offset.y
                }));
            }
        }
    }

    update(dt) {
        super.update(dt);
    }

    draw(context: CanvasRenderingContext2D) {

        context.save();
        context.fillStyle = "red";
        context.strokeStyle = "white";
        context.lineWidth = (GameObject.mouseOverTarget === this) ? 3 : 2;
        
        context.beginPath();

        context.moveTo(this.pos.x + this.shapePath[0].x, this.pos.y + this.shapePath[0].y);
        for(let i=1; i<this.shapePath.length; i++) {
            const point = this.shapePath[i];
            context.lineTo(this.pos.x + point.x, this.pos.y + point.y);
        }
        
        context.closePath();
        context.clip();
        context.drawImage(this.background, -this.bgPos.x + this.pos.x, -this.bgPos.y + this.pos.y, this.app.canvas.width, this.app.canvas.height);
        context.stroke();

        context.restore();
    }

    isPointInObbject(point: Vec2) {
        return this.isPointInPoly(point, this.shapePath, this.pos);
    }

    protected onDragStart() { 
        this.focus();
     }
    protected onDragMove(newPos: Vec2) {
        this.pos = newPos;
    }

    // https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon/17490923#17490923
    private isPointInPoly(p: Vec2, polygon: IVec2[], offset: IVec2) {
        p = p.sub(offset);

        var isInside = false;
        var minX = polygon[0].x, maxX = polygon[0].x;
        var minY = polygon[0].y, maxY = polygon[0].y;
        for (var n = 1; n < polygon.length; n++) {
            var q = polygon[n];
            minX = Math.min(q.x, minX);
            maxX = Math.max(q.x, maxX);
            minY = Math.min(q.y, minY);
            maxY = Math.max(q.y, maxY);
        }
    
        if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
            return false;
        }
    
        let i = 0;
        let j = polygon.length - 1;
        for (; i < polygon.length; j = i++) {
            if ( (polygon[i].y > p.y) != (polygon[j].y > p.y) &&
                    p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
                isInside = !isInside;
            }
        }
    
        return isInside;
    }
}

class App
{
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    input: InputManager;
    private loopTimer: Timer = new Timer();
    private frameCounter: number = 0;
    private runningTime: number = 0;
    private framesPerSecond: number = 0;

    constructor() {
        this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
        this.context = this.canvas.getContext("2d");
        this.resize();
        this.input = new InputManager(this.canvas);   

        
    }

    reset() {
        GameObject.objects = [];
        GameObject.mouseOverTarget = null;
        GameObject.dragTarget = null;
    }

    update(deltaTime: number) { }
    draw(context: CanvasRenderingContext2D) { }

    run() {
        this.loopTimer.stop();
        const deltaTime = this.loopTimer.deltaTime;
        this.runningTime += deltaTime;
        this.frameCounter += 1;
        if(this.runningTime >= 1) {
            this.framesPerSecond = this.frameCounter;
            this.runningTime = 0;
            this.frameCounter = 0;
            console.log(this.framesPerSecond);
        }
        this.loopTimer.start();

        this.update(deltaTime);
        this.draw(this.context);
        this.input.mouse.update();

        requestAnimationFrame(() => {
            this.run() 
        });
    }

    resize() {
        const w = this.canvas.parentElement.clientWidth;
        const h = this.canvas.parentElement.clientHeight;
        console.log( `${w}px - ${h}px`);

        this.canvas.width  = w;
        this.canvas.height = h; 
        this.canvas.style.width  = `${w}px`;
        this.canvas.style.height = `${h}px`;
    }
}

class MyApp extends App
{
    image: HTMLImageElement;

    rows: number = 8;
    cols: number = 8;

    puzzlePieces: GameObject[] = [];

    constructor() {
        super();

        this.image = new Image();
        // this.image.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcRrNdrWyJmu5LOVRRHjYIXGeHfe92hXtJUgMwsF0_XM-35-AoJs&usqp=CAU";
        // this.image.src = "https://i.ytimg.com/vi/dFbDdOlMnr0/maxresdefault.jpg";
        // this.image.src = "https://live.staticflickr.com/3876/14836784553_344a739880_n.jpg";
        // this.image.src = "http://getwallpapers.com/wallpaper/full/1/b/8/1068808-download-awesome-background-pictures-for-computer-1920x1200-for-iphone.jpg";
        this.image.src = "https://coolbackgrounds.io/images/backgrounds/black/black-radial-gradient-bb05ed79.jpg";

        this.generatePuzzlePieces();
    }

    reset() {
        super.reset();
        this.generatePuzzlePieces();
    }

    generatePuzzleEdge(length: number, rot: number, basePos: number, baseLen: number, tipPos: number, tipLen, height: number) {
        const hLen = length * 0.5;
        const hBaseLen = baseLen * 0.5;
        const hTipLen = tipLen * 0.5;

        const line = new Path([ 
            {x: 0, y: 0},
            {x: basePos-hBaseLen, y: 0}, 
            {x: tipPos-hTipLen, y:height}, 
            {x: tipPos+hTipLen, y:height}, 
            {x: basePos+hBaseLen, y: 0}, 
            {x: 1, y: 0}, 
        ]);

        line.points.forEach(p => {
            p.mulEqual({x: length, y: length});
            p.subEqual({x: hLen, y: 0});
            p.pivot(rot);
        });

        return line;
    }

    generateStraightEdge(length: number, rot: number): Path {
        const hLen = length * 0.5;

        const line = new Path([ 
            {x: 0, y: 0},
            {x: 1, y: 0}, 
        ]);

        line.points.forEach(p => {
            p.mulEqual({x: length, y: length});
            p.subEqual({x: hLen, y: 0});
            p.pivot(rot);
        });

        return line;
    }

    generatePuzzlePieces() {
        const tileWidth = this.canvas.width / this.cols;
        const tileHeight = this.canvas.height / this.rows;
        const hTileWidth = tileWidth * 0.5;
        const hTileHeight = tileHeight * 0.5;

        this.puzzlePieces = [];
        const vEdges: Path[][] = [];
        const hEdges: Path[][] = [];

        // Generate all edges
        for(let y=0; y<=this.rows; y++) {
            vEdges.push([]);
            hEdges.push([]);
            for(let x=0; x<=this.cols; x++) {

                let hLine: Path = null;
                let vLine: Path = null;

                const rr = (min: number, max: number): number => {
                    return (Math.random() * (max - min) + min);
                };

                const basePosRange = (basePosSlider.get() as string[]).map(z => parseFloat(z));
                const baseSizeRange = (baseSizeSlider.get() as string[]).map(z => parseFloat(z));
                const tipSizeRange = (tipSizeSlider.get() as string[]).map(z => parseFloat(z));
                const tipHeightRange = (tipHeightSlider.get() as string[]).map(z => parseFloat(z));

                {
                    const basePos = rr(basePosRange[0], basePosRange[1]);
                    const baseLen = rr(baseSizeRange[0], baseSizeRange[1]);
                    const tipPos = basePos;
                    const tipLen = rr(tipSizeRange[0], tipSizeRange[1]);;
                    const height = rr(tipHeightRange[0], tipHeightRange[1]) * (Math.random() >= 0.5 ? 1 : -1);
    
                    hLine = (y == 0 || y == this.rows) ? 
                        this.generateStraightEdge(tileWidth, 0) :
                        this.generatePuzzleEdge(tileWidth, 0, basePos, baseLen, tipPos, tipLen, height);
                }
                
                {
                    const basePos = rr(basePosRange[0], basePosRange[1]);
                    const baseLen = rr(baseSizeRange[0], baseSizeRange[1]);
                    const tipPos = basePos;
                    const tipLen = rr(tipSizeRange[0], tipSizeRange[1]);;
                    const height = rr(tipHeightRange[0], tipHeightRange[1]) * (Math.random() >= 0.5 ? 1 : -1);

                    vLine = ( x == 0 || x == this.cols) ?
                        this.generateStraightEdge(tileHeight, Math.PI * 0.5) :
                        this.generatePuzzleEdge(tileWidth, Math.PI * 0.5, basePos, baseLen, tipPos, tipLen, height);
                }

                hEdges[y].push( hLine.toSpline().toPath(0.1) );
                vEdges[y].push( vLine.toSpline().toPath(0.1) );
            }
        }


        for(let y=0; y<this.rows; y++) {
            for(let x=0; x<this.cols; x++) {
                const pos = new Vec2({
                    x: (x * tileWidth) + (tileWidth / 2),
                    y: (y * tileHeight) + (tileHeight / 2)
                });
                
                const edges: PuzzlePieceEdge[] = [];
                const tEdgePoints = [...hEdges[y][x].points];
                const rEdgePoints = [...vEdges[y][x+1].points];
                const bEdgePoints = [...hEdges[y+1][x].points].reverse();
                const lEdgePoints = [...vEdges[y][x].points].reverse();
            
                edges.push( new PuzzlePieceEdge(tEdgePoints, new Vec2({x: 0, y: -hTileHeight}) ) ); // top edge
                edges.push( new PuzzlePieceEdge(rEdgePoints, new Vec2({x: hTileWidth, y: 0})) );   // right edge
                edges.push( new PuzzlePieceEdge(bEdgePoints, new Vec2({x: 0, y: hTileHeight})) ); // bottom edge
                edges.push( new PuzzlePieceEdge(lEdgePoints, new Vec2({x: -hTileWidth, y: 0})) );  // left edge

                const piece = new PuzzlePiece(this, this.image, pos, new Vec2(pos), edges);
                this.puzzlePieces.push(piece);
            }
        }
    }

    update(deltaTime) {
        GameObject.mouseOverTarget = null;
        const objects = [...GameObject.objects];
        for(let i=0; i<objects.length; i++) {
            const obj = objects[i];
            obj.update(deltaTime);
        }
    }

    draw(context: CanvasRenderingContext2D) {
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.fillStyle = '#fafafa';
        context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const objects = [...GameObject.objects];
        for(let i=objects.length-1; i>=0; i--) {
            const obj = objects[i];
            obj.draw(context);
        }
    }
}



// ============================================================================
// DIRTY HTML EVENT BINDING STUFF
// ============================================================================

const basePosSliderElement = document.getElementById('base-position-slider');
const basePosSlider = noUiSlider.create(basePosSliderElement, {
   start: [0.4, 0.6],
   tooltips: [wNumb({decimals: 2}), wNumb({decimals: 2})],
   connect: true,
   step: 0.01,
   range: { min: 0.1,  max: 0.9 },
});

const baseSizeSliderElement = document.getElementById('base-size-slider');
const baseSizeSlider = noUiSlider.create(baseSizeSliderElement, {
   start: [0.1, 0.2],
   tooltips: [wNumb({decimals: 2}), wNumb({decimals: 2})],
   connect: true,
   step: 0.01,
   range: { min: 0,  max: 0.5 },
});

const tipSizeSliderElement = document.getElementById('tip-size-slider');
const tipSizeSlider = noUiSlider.create(tipSizeSliderElement, {
   start: [0.1, 0.2],
   tooltips: [wNumb({decimals: 2}), wNumb({decimals: 2})],
   connect: true,
   step: 0.01,
   range: { min: 0,  max: 0.5 },
});

const tipHeightSliderElement = document.getElementById('tip-height-slider');
const tipHeightSlider = noUiSlider.create(tipHeightSliderElement, {
   start: [0.1, 0.2],
   // tooltips: [wNumb({decimals: 2}), wNumb({decimals: 2})],
   connect: true,
   step: 0.01,
   range: { min: 0.1,  max: 0.4 },
});

function onGeneratePuzzleClick() {   
    app.reset();
}

const btnUpdate = document.getElementById('btnGeneratePuzzle');
btnUpdate.onclick = onGeneratePuzzleClick;


// ============================================================================
let app = new MyApp();
app.run();