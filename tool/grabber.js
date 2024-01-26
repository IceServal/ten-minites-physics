class Grabber
{
    constructor()
    {
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(1);
        this.raycaster.params.Line.threshold = 0.1;
        this.subject = null;
        this.distance = 0.0;
        this.last_time = 0.0;
        this.last_position = Compact_Vector3.from_size(1);
        this.last_velocity = Compact_Vector3.from_size(1);

        this.event_wrapper = this._event_wrapper();
        container.addEventListener('pointerdown', this.event_wrapper.on_pointer_down, false);
        container.addEventListener('pointermove', this.event_wrapper.on_pointer_move, false);
        container.addEventListener('pointerup',   this.event_wrapper.on_pointer_up,   false);
    }

    update_raycaster(x, y)
    {
        let rectangle = renderer.domElement.getBoundingClientRect();
        this.mouse_position = new THREE.Vector2();
        this.mouse_position.x = +((x - rectangle.left) / rectangle.width) * 2.0 - 1.0;
        this.mouse_position.y = -((y - rectangle.top) / rectangle.height) * 2.0 + 1.0;
        this.raycaster.setFromCamera(this.mouse_position, camera);
    }

    grab(x, y)
    {
        this.subject = null;
        this.update_raycaster(x, y);
        let intersects = this.raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            let object = intersects[0].object.userData;
            if (object) {
                this.subject = object;
                this.distance = intersects[0].distance;
                let position = this.raycaster.ray.origin.clone();
                position.addScaledVector(this.raycaster.ray.direction, this.distance);
                this.last_position.assign_components_of(position.x, position.y, position.z);
                this.last_velocity.assign_components_of(0.0, 0.0, 0.0);
                this.subject.grab(this.last_position, this.last_velocity);
                this.time = world.time;

                if (world.paused) pause_or_resume();
            }
        }
    }

    move(x, y)
    {
        if (this.subject) {
            this.update_raycaster(x, y);
            let position = this.raycaster.ray.origin.clone();
            position.addScaledVector(this.raycaster.ray.direction, this.distance);

            if (this.time < world.time) {
                let velocity = Compact_Vector3.from_size(1);
                velocity.assign_components_of(position.x, position.y, position.z);
                velocity.subtract(this.last_position, 0, 0);
                velocity.scale(1.0 / (world.time - this.time));

                this.last_position.assign_components_of(position.x, position.y, position.z);
                this.last_velocity.scale(0.2, 0);
                this.last_velocity.add(velocity, 0, 0, 0.8);
                this.time = world.time;
                this.subject.move(this.last_position, this.last_velocity);
            }
        }
    }

    drop(x, y)
    {
        if (this.subject) {
            this.subject.drop(this.last_position, this.last_velocity);
            this.subject = null;
        }
    }

    _event_wrapper()
    {
        let wrapper = {grabber: this};

        wrapper.on_pointer_down = function (event) {
            event.preventDefault();

            let grabber = wrapper.grabber;
            grabber.grab(event.clientX, event.clientY);
            if (grabber.subject) {
                controller.saveState();
                controller.enabled = false;
            }
        }

        wrapper.on_pointer_move = function (event) {
            event.preventDefault();

            let grabber = wrapper.grabber;
            grabber.move(event.clientX, event.clientY);
        }

        wrapper.on_pointer_up = function (event) {
            event.preventDefault();

            let grabber = wrapper.grabber;
            if (grabber.subject) {
                grabber.drop(event.clientX, event.clientY);
                controller.reset();
                controller.enabled = true;
            }
        }

        return wrapper;
    }
};

