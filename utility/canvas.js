class Plotting_Scale
{
    constructor()
    {
        this.world_size = new Vector2(1.0, 1.0);
        this.canvas_size = new Vector2(1.0, 1.0);
        this.scale = 1.0;
    }

    static from(world_size, canvas_size, scale)
    {
        if (
            false
            || Math.abs(scale - canvas_size.x / world_size.x) > 1e-4
            || Math.abs(scale - canvas_size.y / world_size.y) > 1e-4
        ) {
            console.log("WARNING: Plotting scale is inconsistent with width or height ratio between canvas and world!");
        }

        let result = new Plotting_Scale();
        result.world_size.copy(world_size);
        result.canvas_size.copy(canvas_size);
        result.scale = scale;
        return result;
    }

    clone()
    {
        let result = new Plotting_Scale().copy(this);
        return result;
    }

    copy(a)
    {
        this.world_size.copy(a.world_size);
        this.canvas_size.copy(a.canvas_size);
        this.scale = a.scale;
        return this;
    }

    world_to_canvas(position)
    {
        let result = position.clone().scale(this.scale);
        result.y = this.canvas_size.y - result.y;
        return result;
    }

    canvas_to_world(position)
    {
        let result = position.clone().scale(1.0 / this.scale);
        result.y = this.world_size.y - result.y;
        return result;
    }
};

class Canvas
{
    constructor()
    {
        this.canvas = undefined;
        this.context = undefined;
        this.plotting_scale = undefined;
    }

    static from(canvas_name, plotting_scale, pixel_rendering = false)
    {
        let canvas = document.getElementById(canvas_name);
        canvas.width = plotting_scale.canvas_size.x;
        canvas.height = plotting_scale.canvas_size.y;

        let result = new Canvas();
        result.canvas = canvas;
        result.context = (pixel_rendering ? canvas.getContext("2d", { willReadFrequently: true }) : canvas.getContext("2d"));
        result.plotting_scale = plotting_scale;

        return result;
    }

    clear()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render_line(line, width, color = "#000000")
    {
        let p0 = this.plotting_scale.world_to_canvas(line.point0);
        let p1 = this.plotting_scale.world_to_canvas(line.point1);
        let old_width = this.context.lineWidth;
        let new_width = this.plotting_scale.scale * width;

        this.context.lineWidth = new_width;
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.moveTo(p0.x, p0.y);
        this.context.lineTo(p1.x, p1.y);
        this.context.stroke();
        this.context.lineWidth = old_width;
    }

    render_line_strip(points, width, color = "#000000", close = false)
    {
        let num_points = points.length;
        if (num_points < 2) return;

        let old_width = this.context.lineWidth;
        let new_width = this.plotting_scale.scale * width;

        this.context.lineWidth = new_width;
        this.context.strokeStyle = color;
        this.context.beginPath();
        let p = this.plotting_scale.world_to_canvas(points[0]);
        this.context.moveTo(p.x, p.y);
        for (let i = 1; i < num_points; i++) {
            p = this.plotting_scale.world_to_canvas(points[i]);
            this.context.lineTo(p.x, p.y);
        }
        if (close) {
            this.context.closePath();
        }
        this.context.stroke();
        this.context.lineWidth = old_width;
    }

    _render_circle(center, radius, wireframe)
    {
        this.context.beginPath();
        this.context.arc(center.x, center.y, radius, 0.0, 2.0 * Math.PI);
        this.context.closePath();

        if (wireframe) {
            this.context.stroke();
        } else {
            this.context.fill();
        }
    }

    render_circle(circle, color = "#FFFFFF")
    {
        let c = this.plotting_scale.world_to_canvas(circle.center);
        let r = this.plotting_scale.scale * circle.radius;

        this.context.fillStyle = color;
        this._render_circle(c, r, false);
    }

    render_wireframe_circle(circle, width, color = "#000000")
    {
        let c = this.plotting_scale.world_to_canvas(circle.center);
        let r = this.plotting_scale.scale * circle.radius;
        let w = this.plotting_scale.scale * width;

        this.context.strokeStyle = color;
        this.context.lineWidth = w;
        this._render_circle(c, r, true);
    }

    render_rod(rod, color = "#FFFFFF")
    {
        let line = rod.line;
        let radius = rod.radius;

        let p = this.plotting_scale.world_to_canvas(line.point0);
        let a = line.angle;
        let l = this.plotting_scale.scale * line.length;
        let r = this.plotting_scale.scale * radius;

        this.context.fillStyle = color;
        this.context.translate(p.x, p.y);
        this.context.rotate(-a);
        this.context.fillRect(0.0, -r, l, 2.0 * r);
        this._render_circle(Vector2.from_components(0.0, 0.0), r);
        this._render_circle(Vector2.from_components(l,   0.0), r);
        this.context.resetTransform();
    }

    render_text(text, position, color = "#000000", font = "16px Cascadia Code")
    {
        let context = this.context;
        let plotting_scale = this.plotting_scale;

        let p = plotting_scale.world_to_canvas(position);

        context.font = font;
        context.fillStyle = color;
        context.fillText(text, p.x, p.y);
    }

    window_to_canvas(position)
    {
        let canvas = this.canvas;
        let bounds = canvas.getBoundingClientRect();
        return Vector2.from_components(
            position.x - bounds.left - canvas.clientLeft,
            position.y - bounds.top - canvas.clientTop,
        );
    }

    add_event_listener(event, listener, config)
    {
        this.canvas.addEventListener(event, listener, config);
    }
};

