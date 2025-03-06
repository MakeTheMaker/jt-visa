/*
  JT Merkit -tietokilpailu/bootstrap-laajennus
*/
;(function($) {

  var quiz_count = 0;
  
  $.fn.quiz = function(filename) {
    if (typeof filename === "string") {
      $.getJSON(filename, render.bind(this)).fail(function() {
        console.error("Virhe ladattaessa unicorns.json-tiedostoa");
      });
    } else {
      render.call(this, filename);
    }
  };
  
  function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  }

  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDm5cqxaXxa0kwkVkRsujrqsNzFEcW59Rw",
    authDomain: "jtmerkit.firebaseapp.com",
    projectId: "jtmerkit",
    storageBucket: "jtmerkit.firebasestorage.app",
    messagingSenderId: "200535246101",
    appId: "1:200535246101:web:3f493e3f08c8d3da77951c",
    measurementId: "G-SE7YN3P2NT"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // Initialize App Check with reCAPTCHA v3
  const appCheck = firebase.appCheck();
  appCheck.activate(
    '6LddteoqAAAAANmIz644Cu4xtUbnGQqwlW7U34fN', // Replace with your reCAPTCHA v3 Site Key
    true // Enforce App Check immediately
  );

  async function loadHighScores(limit = 100) {
    try {
      const snapshot = await db.collection('highscores')
        .orderBy('score', 'desc')
        .orderBy('time', 'asc')
        .limit(limit)
        .get();
      const scores = snapshot.docs.map(doc => doc.data());
      console.log("Loaded high scores:", scores);
      return scores;
    } catch (error) {
      console.error("Virhe ladattaessa ennätyksiä:", error);
      return [];
    }
  }

  async function saveHighScore(nickname, score, time) {
    try {
      console.log("Saving high score:", { nickname, score, time });
      await db.collection('highscores').add({ nickname, score, time });
      console.log("Score saved, trimming excess...");
      const highScores = await loadHighScores();
      if (highScores.length > 100) {
        const excessScores = highScores.slice(100);
        for (const excess of excessScores) {
          const query = await db.collection('highscores')
            .where('nickname', '==', excess.nickname)
            .where('score', '==', excess.score)
            .where('time', '==', excess.time)
            .limit(1)
            .get();
          if (!query.empty) {
            await query.docs[0].ref.delete();
            console.log("Deleted excess score:", excess);
          }
        }
      }
    } catch (error) {
      console.error("Virhe tallennettaessa ennätystä:", error);
    }
  }

  async function displayLeaderboard() {
    const topScores = await loadHighScores(10); // Fetch top 10 scores
    let leaderboardHtml = `
      <h2>Top 10</h2>
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Sija</th>
            <th>Nimi</th>
            <th>Pisteet</th>
            <th>Aika</th>
          </tr>
        </thead>
        <tbody>
    `;
    if (topScores.length > 0) {
      topScores.forEach((entry, index) => {
        const rank = index + 1;
        const name = entry.nickname || 'N/A';
        const score = entry.score !== undefined ? entry.score : 'N/A';
        const time = entry.time !== undefined ? `${Math.min(Math.floor(entry.time), 999)}s` : 'N/A';
        let rankClass = '';
        let rankDisplay = rank + '.';
        if (rank === 1) {
          rankClass = 'gold';
          rankDisplay = '🥇';
        } else if (rank === 2) {
          rankClass = 'silver';
          rankDisplay = '🥈';
        } else if (rank === 3) {
          rankClass = 'bronze';
          rankDisplay = '🥉';
        }
        leaderboardHtml += `
          <tr class="${rankClass}">
            <td class="rank">${rankDisplay}</td>
            <td>${name}</td>
            <td>${score}</td>
            <td>${time}</td>
          </tr>
        `;
      });
    } else {
      leaderboardHtml += '<tr><td colspan="4">Ei vielä ennätyksiä.</td></tr>';
    }
    leaderboardHtml += '</tbody></table>';
    return leaderboardHtml;
  }

  async function showHighScores() {
    const highScores = await loadHighScores();

    let scoresHtml = '';
    if (highScores.length > 0) {
      scoresHtml += `
        <div class="high-score-header">
          <span class="rank">Sija</span>
          <span class="nickname">Nimi</span>
          <span class="score">Pisteet</span>
          <span class="time">Aika</span>
        </div>
        <div class="high-score-content">
      `;
      scoresHtml += highScores.map((entry, index) => {
        const rank = index + 1;
        const name = entry.nickname || 'N/A';
        const score = entry.score !== undefined ? entry.score : 'N/A';
        const time = entry.time !== undefined ? `${Math.min(Math.floor(entry.time), 999)}s` : 'N/A';
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        return `
          <div class="high-score-row ${rankClass}">
            <span class="rank">${rank}.</span>
            <span class="nickname">${name}</span>
            <span class="score">${score}</span>
            <span class="time">${time}</span>
          </div>
        `;
      }).join('');
      scoresHtml += `</div>`;
    } else {
      scoresHtml = `<p>Ei vielä ennätyksiä.</p>`;
    }

    Swal.fire({
      title: "Ennätykset",
      html: `<div class="high-scores-table">${scoresHtml}</div>`,
      confirmButtonText: "Sulje",
      confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
      customClass: {
        popup: 'high-scores-popup'
      },
      background: $('body').hasClass('dark-mode') 
        ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
        : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
      color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
    });
  }

  async function showScoreAndCheckHighScore(state) {
    const highScores = await loadHighScores();
    const playerScore = { score: state.correct, time: state.timeElapsed };
    
    const isHighScore = state.correct > 0 && (highScores.length < 100 || highScores.some(entry => 
      playerScore.score > entry.score || 
      (playerScore.score === entry.score && playerScore.time < entry.time)
    ));

    const minutes = Math.floor(state.timeElapsed / 60);
    const seconds = state.timeElapsed % 60;
    const scoreText = `Pisteesi: ${state.correct} / ${state.total}<br>Aika: ${minutes}m ${seconds}s`;

    if (isHighScore) {
      const sortedScores = [...highScores, playerScore].sort((a, b) => {
        if (b.score === a.score) return a.time - b.time;
        return b.score - a.score;
      });
      const playerRank = sortedScores.findIndex(entry => 
        entry.score === playerScore.score && entry.time === playerScore.time
      ) + 1;

      Swal.fire({
        title: "🏆 Uusi ennätys!",
        html: `
          <div class="new-high-score-content">
            <p>${scoreText}</p>
            <p class="rank-text">Sijoituksesi: <strong>${playerRank}.</strong></p>
            <p class="input-label">Syötä nimimerkkisi (max 8 merkkiä):</p>
          </div>
        `,
        input: "text",
        inputAttributes: {
          maxlength: 8
        },
        inputValidator: (value) => {
          if (value.length > 8) {
            return 'Nimimerkki voi olla enintään 8 merkkiä!';
          }
          return null;
        },
        showCancelButton: true,
        confirmButtonText: "Tallenna",
        cancelButtonText: "Yritä uudelleen",
        confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
        cancelButtonColor: $('body').hasClass('dark-mode') ? "#4A8A84" : "#1D5A5B",
        inputPlaceholder: "Nimimerkki",
        background: $('body').hasClass('dark-mode') 
          ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
          : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
        color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748',
        customClass: {
          popup: 'new-high-score-popup'
        }
      }).then((result) => {
        if (result.isDismissed) {
          location.reload();
          return;
        }
        const inputValue = result.value;
        if (!inputValue) {
          Swal.fire({
            title: "Virhe!",
            text: "Syötä nimimerkki!",
            icon: "error",
            confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
            background: $('body').hasClass('dark-mode') 
              ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
              : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
            color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
          });
          return;
        }
        saveHighScore(inputValue, playerScore.score, playerScore.time).then(() => {
          Swal.fire({
            title: "Tallennettu!",
            text: "Nimimerkkisi on ennätyksissä!",
            icon: "success",
            confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
            background: $('body').hasClass('dark-mode') 
              ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
              : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
            color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
          }).then(() => {
            location.reload();
          });
        }).catch(error => {
          console.error("Saving failed:", error);
          Swal.fire({
            title: "Virhe!",
            text: "Tallennus epäonnistui.",
            icon: "error",
            background: $('body').hasClass('dark-mode') 
              ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
              : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
            color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
          });
        });
      });
    } else {
      if (state.correct === 0) {
        Swal.fire({
          title: "Peli päättyi!",
          text: scoreText,
          confirmButtonText: "Yritä uudelleen?",
          confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
          background: $('body').hasClass('dark-mode') 
            ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
            : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
          color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
        }).then((result) => {
          if (result.isConfirmed) {
            location.reload();
          }
        });
      } else {
        Swal.fire({
          title: "Peli päättyi!",
          text: scoreText,
          confirmButtonText: "OK",
          confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
          showCancelButton: true,
          cancelButtonText: "Yritä uudelleen",
          cancelButtonColor: $('body').hasClass('dark-mode') ? "#4A8A84" : "#1D5A5B",
          background: $('body').hasClass('dark-mode') 
            ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
            : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
          color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
        }).then((result) => {
          if (!result.isConfirmed) {
            location.reload();
          }
        });
      }
    }
  }
  
  function render(quiz_opts) {
    var questions = quiz_opts.questions;
    shuffle(questions);
  
    var state = {
      correct: 0,
      wrong: 0,
      total: questions.length,
      answered: 0,
      timeElapsed: 0
    };
  
    var $quiz = $(this)
      .attr("class", "carousel slide")
      .attr("data-ride", "carousel");
  
    var name = $quiz.attr("id") || "quiz_" + (++quiz_count);
    $quiz.attr('id', name);
  
    var $container = $quiz.parent();
    
    var $slides = $("<div>")
      .attr("class", "carousel-inner")
      .attr("role", "listbox")
      .appendTo($quiz);
  
    var $endButton = $('<button>')
      .attr('class', 'end-button')
      .text("Lopeta");
  
    var $darkModeToggle = $('<button>')
      .attr('id', 'dark-mode-toggle')
      .text($('body').hasClass('dark-mode') ? 'Vaalea teema' : 'Tumma teema')
      .click(function() {
        $('body').toggleClass('dark-mode');
        const isDarkMode = $('body').hasClass('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        $('.dark-mode-toggle').text(isDarkMode ? 'Vaalea teema' : 'Tumma teema');
      });
  
    var $progressContainer = $('<div>')
      .attr('class', 'quiz-progress text-center');
  
    var $progressText = $('<span>')
      .text(`Kysymyksiä jäljellä: ${state.total - state.answered}, Oikein: ${state.correct}, Väärin: ${state.wrong}`)
      .appendTo($progressContainer);
  
    var $timer = $('<div>')
      .attr('class', 'quiz-timer')
      .text("Aika: 0s");
  
    var timerInterval;
    var allTimers = [];
    var allProgressTexts = [];
  
    var $highScoresButton = $('<button>')
      .attr('class', 'high-scores-button')
      .text("Ennätykset")
      .click(showHighScores);
  
    // Create a single progress-circles instance to track state
    var $progressCircles = $('<ol>')
      .attr('class', 'progress-circles');
  
    var $title_slide = $("<div>")
      .attr("class", "item active")
      .appendTo($slides);
  
    var $topControlsTitle = $('<div>')
      .attr('class', 'top-controls')
      .appendTo($title_slide);
  
    var $topButtonRowTitle = $('<div>')
      .attr('class', 'top-button-row')
      .appendTo($topControlsTitle);
  
    // Only include the dark mode toggle on the title slide (Lopeta button removed)
    $darkModeToggle.clone(true).addClass('dark-mode-toggle').appendTo($topButtonRowTitle);
  
    $('<h1>')
      .text(quiz_opts.title)
      .attr('class', 'quiz-title')
      .appendTo($title_slide);
  
    var $start_button = $("<div>")
      .attr("class", "quiz-answers")
      .appendTo($title_slide);
  
    $("<button>")
      .attr('class', 'quiz-button btn')
      .text("Aloita!")
      .click(function() {
        $quiz.carousel('next');
        $progressCircles.addClass('show'); // Show progress circles on question slides
        if (!timerInterval) {
          timerInterval = setInterval(function() {
            state.timeElapsed++;
            var minutes = Math.floor(state.timeElapsed / 60);
            var seconds = state.timeElapsed % 60;
            allTimers.forEach($t => $t.text(`Aika: ${minutes}m ${seconds}s`));
          }, 1000);
        }
        $('.quiz-header').addClass('hidden');
      })
      .appendTo($start_button);

    $highScoresButton.clone(true).appendTo($start_button);

    // Add leaderboard container
    var $leaderboardContainer = $('<div>')
      .attr('class', 'leaderboard-container')
      .appendTo($title_slide);
    displayLeaderboard().then(html => {
      $leaderboardContainer.html(html);
    });
  
    // Populate the progress-circles with unanswered state
    $.each(questions, function(question_index, question) {
      $('<li>')
        .addClass('unanswered') // Ensure all li elements start with 'unanswered' class
        .appendTo($progressCircles);
    });
  
    $.each(questions, function(question_index, question) {
      var last_question = (question_index + 1 === state.total);
      var $item = $("<div>")
        .attr("class", "item")
        .appendTo($slides);
  
      var $topControls = $('<div>')
        .attr('class', 'top-controls')
        .appendTo($item);
  
      var $topButtonRow = $('<div>')
        .attr('class', 'top-button-row')
        .appendTo($topControls);
  
      $endButton.clone().appendTo($topButtonRow).click(function() {
        var unansweredCount = state.total - state.answered;
        state.wrong += unansweredCount;
        state.answered = state.total;
        allProgressTexts.forEach($pt => $pt.text(`Kysymyksiä jäljellä: ${state.total - state.answered}, Oikein: ${state.correct}, Väärin: ${state.wrong}`));
        
        // Update progress-circles for unanswered questions
        $progressCircles.find('li').slice(state.answered - unansweredCount).removeClass('unanswered').addClass('wrong');
        
        $quiz.carousel(state.total + 1);
        $progressCircles.removeClass('show');
        $progressContainer.addClass('hidden');
        clearInterval(timerInterval);
        showScoreAndCheckHighScore(state);
      });
  
      $darkModeToggle.clone(true).addClass('dark-mode-toggle').appendTo($topButtonRow);
  
      var $questionProgress = $progressContainer.clone().appendTo($item);
      allProgressTexts.push($questionProgress.find('span'));
  
      if (question.image) {
        var $img_div = $('<div>')
          .attr('class', 'question-image')
          .appendTo($item);
        $("<img>")
          .attr("class", "img-responsive")
          .attr("src", question.image)
          .appendTo($img_div);
      }
  
      var $answers = $("<div>")
        .attr("class", "quiz-answers")
        .appendTo($item);
  
      var $bottomControls = $('<div>')
        .attr('class', 'bottom-controls')
        .appendTo($item);
  
      var $buttonRow = $('<div>')
        .attr('class', 'button-row')
        .appendTo($bottomControls);
  
      $highScoresButton.clone(true).appendTo($buttonRow);
      var $questionTimer = $timer.clone().appendTo($buttonRow);
      allTimers.push($questionTimer);
  
      // Create a placeholder for progress-circles
      var $progressCirclesPlaceholder = $('<div>')
        .attr('class', 'progress-circles-placeholder')
        .appendTo($item);
  
      // Use only this question's answers and shuffle them
      var finalAnswers = question.answers.slice(); // Create a copy of the answers array
      shuffle(finalAnswers); // Shuffle the answers for this question
      var correctAnswer = question.answers[0]; // The correct answer is always the first one in the original array
      var correctIndex = finalAnswers.indexOf(correctAnswer); // Find its index after shuffling
  
      $.each(finalAnswers, function(answer_index, answer) {
        var ans_btn = $("<button>")
          .attr('class', 'quiz-button btn')
          .html(answer)
          .appendTo($answers);
  
        var correct = (answer_index === correctIndex);
        var opts = {
          title: correct ? "Oikein!" : "Väärin",
          text: correct 
            ? (question.correct.text ? question.correct.text : "Hienoa työtä!") 
            : `Oikea vastaus oli "${correctAnswer}".${question.correct.text ? " " + question.correct.text : ""}`,
          icon: correct ? "success" : "error",
          confirmButtonText: last_question ? "Näytä tulokset" : "Seuraava kysymys",
          confirmButtonColor: $('body').hasClass('dark-mode') ? "#2B6B66" : "#2C7A7B",
          allowOutsideClick: false,
          allowEscapeKey: false
        };
  
        ans_btn.on('click', function() {
          console.log("Answer button clicked:", answer, "Correct:", correct);
  
          function next() {
            state.answered++;
            if (correct) state.correct++;
            else state.wrong++;
  
            // Update the progress-circles
            $progressCircles.find('li').eq(question_index)
              .removeClass('unanswered')
              .addClass(correct ? 'correct' : 'wrong');
  
            allProgressTexts.forEach($pt => $pt.text(`Kysymyksiä jäljellä: ${state.total - state.answered}, Oikein: ${state.correct}, Väärin: ${state.wrong}`));
  
            $quiz.carousel('next');
  
            if (last_question) {
              $results_ratio.text(`Sait ${Math.round(100 * (state.correct / state.total))}% kysymyksistä oikein!`);
              $progressCircles.removeClass('show');
              $progressContainer.addClass('hidden');
              clearInterval(timerInterval);
              showScoreAndCheckHighScore(state);
            }
          }
  
          Swal.fire({
            title: opts.title,
            text: opts.text,
            icon: opts.icon,
            confirmButtonText: opts.confirmButtonText,
            confirmButtonColor: opts.confirmButtonColor,
            allowOutsideClick: opts.allowOutsideClick,
            allowEscapeKey: opts.allowEscapeKey,
            background: $('body').hasClass('dark-mode') 
              ? 'linear-gradient(to bottom, #1A202C, #2D3748)' 
              : 'linear-gradient(to bottom, #FDF6E3, #F7E9C3)',
            color: $('body').hasClass('dark-mode') ? '#E2E8F0' : '#2D3748'
          }).then((result) => {
            if (result.isConfirmed) {
              next();
            }
          });
        });
      });
    });
  
    var $results_slide = $("<div>")
      .attr("class", "item")
      .appendTo($slides);
  
    var $results_title = $('<h1>')
      .attr('class', 'quiz-title')
      .appendTo($results_slide);
  
    var $results_ratio = $('<div>')
      .attr('class', 'results-ratio')
      .appendTo($results_slide);
  
    var $restart_button = $("<div>")
      .attr("class", "quiz-answers")
      .appendTo($results_slide);
  
    $("<button>")
      .attr('class', 'quiz-button btn')
      .text("Yritä uudelleen?")
      .click(function() {
        location.reload();
      })
      .appendTo($restart_button);
  
    // Move progress-circles to the active slide on slide change
    $quiz.on('slide.bs.carousel', function(e) {
      var $nextSlide = $(e.relatedTarget);
      // Only append to question slides (not title or results slide)
      if ($nextSlide.find('.progress-circles-placeholder').length) {
        $progressCircles.appendTo($nextSlide.find('.progress-circles-placeholder'));
      } else {
        $progressCircles.removeClass('show');
      }
    });
  
    $quiz.carousel({"interval": false});
  }
  
})(jQuery);
