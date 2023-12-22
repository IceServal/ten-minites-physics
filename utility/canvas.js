class Plotting_Scale
{
    constructor(world_size, canvas_size, scale, is_ccw_positive)
    {
        this.world_size = world_size;
        this.canvas_size = canvas_size;
        this.is_ccw_positive = is_ccw_positive;

        this.scale = scale;
        if (
            false
            || Math.abs(this.scale - canvas_size.x / world_size.x) > 1e-4
            || Math.abs(this.scale - canvas_size.y / world_size.y) > 1e-4
        ) {
            console.log("WARNING: Plotting scale is inconsistent with width or height ratio between canvas and world!");
        }
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
    constructor(canvas, size, plotting_scale)
    {
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.plotting_scale = plotting_scale

        canvas.width = size.x;
        canvas.height = size.y;
    }

    clear()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render_line(point0, point1, width, color = "#000000")
    {
        let p0 = this.plotting_scale.world_to_canvas(point0);
        let p1 = this.plotting_scale.world_to_canvas(point1);
        let old_width = this.context.lineWidth;
        let new_width = this.plotting_scale.scale * width;

        this.context.lineWidth = new_width;
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.moveTo(p0.x, p0.y);
        this.context.lineTo(p1.x, p1.y);
        this.context.closePath();
        this.context.stroke();
        this.context.lineWidth = old_width;
    }

    render_line_strip(points, width, color = "#000000")
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
        for (let i = 1; i < num_points + 1; i++) {
            p = this.plotting_scale.world_to_canvas(points[i % num_points]);
            this.context.lineTo(p.x, p.y);
        }
        this.context.closePath();
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

    render_circle(center, radius, color = "#FFFFFF")
    {
        let c = this.plotting_scale.world_to_canvas(center);
        let r = this.plotting_scale.scale * radius;

        this.context.fillStyle = color;
        this._render_circle(c, r, false);
    }

    render_wireframe_circle(center, radius, width, color = "#000000")
    {
        let c = this.plotting_scale.world_to_canvas(center);
        let r = this.plotting_scale.scale * radius;
        let w = this.plotting_scale.scale * width;

        this.context.strokeStyle = color;
        this.context.lineWidth = w;
        this._render_circle(c, r, true);
    }

    render_capsule(position, angle, radius, length, color = "#FFFFFF")
    {
        let p = this.plotting_scale.world_to_canvas(position);
        let a = (this.plotting_scale.is_ccw_positive ? angle : -angle);
        let r = this.plotting_scale.scale * radius;
        let l = this.plotting_scale.scale * length;

        this.context.fillStyle = color;
        this.context.translate(p.x, p.y);
        this.context.rotate(a);
        this.context.fillRect(0.0, -r, l, 2.0 * r);
        this._render_circle(new Vector2(0.0, 0.0), r);
        this._render_circle(new Vector2(l,   0.0), r);
        this.context.resetTransform();
    }
};

