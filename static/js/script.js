'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

/////////////////////////////////////////
//  PARENT CLASS

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  click = 0;

  constructor(coords, dist, dur) {
    this.coords = coords; // [lat, lng]
    this.dist = dist; // in km
    this.dur = dur; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _click() {
    this.click++;
  }
}

// child class from Workout
class Running extends Workout {
  type = 'running';

  constructor(coords, dist, dur, cad) {
    super(coords, dist, dur);
    this.cad = cad;
    this._calcPace();
    this._setDescription();
  }
  _calcPace() {
    this.pace = this.dur / this.dist;
    return this.pace;
  }
}

// child class from Workout
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, dist, dur, elev) {
    super(coords, dist, dur);
    this.elev = elev;
    this._calcSpeed();
    this._setDescription();
  }
  _calcSpeed() {
    this.speed = this.dist / (this.dur / 60);
    return this.speed;
  }
}

/////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 17;

  constructor() {
    //
    // Get user's position
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    //  Add all the event listeners on the constructor
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert('Could not get your position');
      });
  }

  _loadMap(position) {
    // get coordinates
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // set my current coordinates
    const coords = [latitude, longitude];

    // position the map on my current coordinates
    this.#map = L.map('map').setView(coords, 17);

    // add a title to the map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Hello World',
    }).addTo(this.#map);

    //  get coordinates from click on the map
    this.#map.on('click', this._showForm.bind(this));

    // render the markers from localStorage on the map
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // remove the hidden class from the form
    form.classList.remove('hidden');
    // the cursor will automatically go to the input field
    inputDistance.focus();
  }

  _hideForm() {
    // empty the input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // add the hidden class to the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    /*
     || equals to OR
     && equals to AND
     
     generic function to go through all items of an array and check a specific condition
     !Number.isFinite(distance) ||
     !Number.isFinite(duration) ||
     !Number.isFinite(cadence)
     */

    //  Helper Functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // STEP 1: prevent the form from submitting
    e.preventDefault();

    // STEP 2: get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // 2.1 -> if activity running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // STEP 3: check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Please enter valid numbers');
      // STEP 4: create a new workout object
      workout = new Running([lat, lng], distance, duration, cadence);
      // STEP 5: add new object to workout array
      this.#workouts.push(workout);
    }

    // 2.2 -> if activity cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // STEP 3: check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Please enter valid numbers');

      // STEP 4: create a new workout object
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // STEP 5: add new object to workout array
    this.#workouts.push(workout);

    console.log(workout);
    console.log(this.#workouts);

    // STEP 6: render workout on map as marker
    this._renderWorkoutMarker(workout);

    // STEP 7: render workout on list
    this._renderWorkout(workout);

    // STEP 8: Hide form & Clear input fields
    this._hideForm();

    // STEP 9: set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.dist}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.dur}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cad}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elev}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id // dataset.id is a string HTML data-id="18182828"
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using the public interface to call the private method
    workout._click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // STEP 1: check if there is any that on the localStorage
    if (!data) return;
    // STEP 2: If there is data, than store on the app workouts array
    this.#workouts = data;
    // STEP 3: render the workouts on the list
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // cannot use _renderWorkoutMarker because the map is not loaded yet
    });
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
