async function main() {
  const musicInfo = await loadCSV('https://raw.githubusercontent.com/meellx/adjust-points/main/music_info.csv');
  const soloLiveData = await loadCSV('https://raw.githubusercontent.com/meellx/adjust-points/main/solo_live_data.csv');
  const multiLiveData1 = await loadCSV('https://raw.githubusercontent.com/meellx/adjust-points/main/multi_live_data_1.csv');
  const multiLiveData2 = await loadCSV('https://raw.githubusercontent.com/meellx/adjust-points/main/multi_live_data_2.csv');

  const targetEventPoints = getNumberById('target-event-points');
  const currentEventPoints = getNumberById('current-event-points');

  const teamData = {
    skills: [
      getNumberById('skill-1'),
      getNumberById('skill-2'),
      getNumberById('skill-3'),
      getNumberById('skill-4'),
      getNumberById('skill-5')
    ],
    talent: getNumberById('talent'),
    eventBonus: getNumberById('event-bonus')
  };

  const maxLevel = getNumberById('max-level');
  const maxLiveBonusUsed = getNumberById('max-live-bonus');
  // スコアのマージン係数
  const scoreMarginMultiplier = getNumberById('score-margin-multiplier');

  /*
  const targetEventPoints = 88;
  const currentEventPoints = 0;

  const teamData = {
    skills: [
      150,
      140,
      130,
      120,
      100
    ],
    talent: 380000,
    eventBonus: 350
  };

  const maxLevel = 25;
  const maxLiveBonusUsed = 10;
  // スコアのマージン係数
  const scoreMarginMultiplier = 0.95;
  */
  // ひとりでライブ固定
  const liveMode = 'soloLive';
  const liveData = soloLiveData;
  const encoreSkillNumber = 1;
  // マラソン固定
  const eventType = 'marathon';
  // 残りのイベントP
  const remainingEventPoints = targetEventPoints - currentEventPoints;
  // 赤エビで近づける時のバッファー
  const bufferPoints = 100 + teamData.eventBonus * 1.5

  // 調整不可能な条件をチェックして、早期終了
  if (remainingEventPoints === 0) {
    document.getElementById("results-content").innerHTML = `
    <strong>現在のイベントPと目標のイベントPが一致しています！</strong>
    `
    document.getElementById("apply-result-button").style.display = "none";
    return;
  } else if (remainingEventPoints < 100) {
    document.getElementById("results-content").innerHTML = `
      <div style="
        color: #e67e22;  /* 明るめのオレンジ */
        font-weight: bold;
        font-size: 16px;
        padding: 12px;
      ">
        現在のイベントPから目標のイベントPまで100P未満のため、調整できません😭<br>
        目標のイベントPを変更してください💦
      </div>
    `;
    document.getElementById("apply-result-button").style.display = "none";
    return;
  } else if (remainingEventPoints <= 100 + teamData.eventBonus) {
    const maxBonus = Math.floor(remainingEventPoints - 100);
    const limitNote = remainingEventPoints === 100 ? "" : "以下";

    document.getElementById("results-content").innerHTML = `
      <div style="
        color: #e67e22;
        font-weight: bold;
        font-size: 16px;
        padding: 12px;
      ">
        現在の条件では調整できません😭<br>
        イベントボーナスを <strong>${maxBonus}%</strong>${limitNote} にしてください💦
      </div>
    `;
    document.getElementById("apply-result-button").style.display = "none";
    return;
  }

  const validSongConstMatches = getValidSongConstMatches({
    remainingEventPoints: remainingEventPoints,
    eventBonus: teamData.eventBonus,
    liveMode: liveMode,
    eventType: eventType,
    maxLiveBonusUsed: maxLiveBonusUsed
  });

  // 有効な楽曲定数があるかどうか判定して処理
  let isValidSongConstFound = false;
  if (validSongConstMatches.length > 0) {
    let matchingSongs = [];
    matchingSongs = extractmatchingSongs({
      validSongConstMatches: validSongConstMatches,
      musicInfo: musicInfo,
      liveData: liveData,
      teamData: teamData,
      maxLevel: maxLevel,
      encoreSkillNumber: encoreSkillNumber,
      scoreMarginMultiplier: scoreMarginMultiplier
    })
    // requiredScoreRatio が小さい順にソート
    // const sortedMatchingSongs = [...matchingSongs].sort((a, b) => a.requiredScoreRatio - b.requiredScoreRatio);
    if (matchingSongs.length > 0) {
      const shortestSong = getShortestDurationSong(matchingSongs, musicInfo);
      displayMatchResult({
        song: shortestSong,
        earnedPoints: remainingEventPoints,
        totalPoints: targetEventPoints,
        eventBonus: teamData.eventBonus,
        remainingPoints: 0
      });
      isValidSongConstFound = true;
    } 
  }

  if (isValidSongConstFound === false) {
    if (remainingEventPoints < 200) {
      document.getElementById("results-content").innerHTML = `
        <div style="
          color: #e67e22;  /* 明るめのオレンジ */
          font-weight: bold;
          font-size: 16px;
          padding: 12px;
        ">
          ポイント調整可能な楽曲が存在しません😭<br>
          イベントボーナスが <strong>0% ～ ${(remainingEventPoints - 100)}%</strong> の間になるように<br>
          編成を変更して再度お試しください💦
        </div>
      `;
      document.getElementById("apply-result-button").style.display = "none";
      return;
    } else if (remainingEventPoints < 800){
      const maxAllowedEventBonus = remainingEventPoints - 100 - Math.floor(remainingEventPoints / 7);
      const minAllowedEventBonus = calculateMinAllowedEventBonus({
        remainingEventPoints,
        teamData,
        scoreMarginMultiplier,
        musicInfo,
        liveData,
        liveMode,
        eventType,
        encoreSkillNumber
      });
      document.getElementById("results-content").innerHTML = `
        <div style="
          color: #e67e22;  /* 明るめのオレンジ */
          font-weight: bold;
          font-size: 16px;
          padding: 12px;
        ">
          ポイント調整可能な楽曲が存在しません😭<br>
          イベントボーナスが <strong>${minAllowedEventBonus}% ～ ${maxAllowedEventBonus}%</strong> の間になるように<br>
          編成を変更して再度お試しください💦
        </div>
      `;
      document.getElementById("apply-result-button").style.display = "none";
      return;
    } else {
      const validHitorinboEnvyData = findValidFallbackSongData({
        title: "独りんぼエンヴィー",
        difficultyName: "expert",
        teamData,
        musicInfo,
        liveData,
        scoreMarginMultiplier,
        remainingEventPoints,
        eventBonus: teamData.eventBonus,
        bufferPoints,
        liveMode,
        maxLiveBonusUsed,
        eventType,
        encoreSkillNumber
      });
      if (validHitorinboEnvyData){
        displayHitorinboEnvyResult({
          data: validHitorinboEnvyData,
          currentPoints: currentEventPoints,
          targetPoints: targetEventPoints,
          eventBonus: teamData.eventBonus
        }
        );
      }
    }
  }
}

function displayMatchResult({
  song,
  earnedPoints,
  totalPoints,
  eventBonus,
  remainingPoints = 0
}) {
  document.getElementById("results-content").innerHTML = `
    ✅ <strong>調整可能な楽曲が見つかりました！</strong><br><br>
    🎵 楽曲: ${song.title}<br>
    🔢 スコア: ${song.requiredScore.toLocaleString()} ～ ${(song.requiredScore + 19999).toLocaleString()}<br>
    💥 ライボ消費数: ${song.requiredLiveBonusUsed}<br>
    🎁 獲得イベントP: ${earnedPoints.toLocaleString()} P<br>
    📈 獲得後の累計イベントP: ${totalPoints.toLocaleString()} P<br>
    🎯 目標までのイベントP: ${remainingPoints.toLocaleString()} P<br>
    💡 イベントボーナス: ${eventBonus} %
  `;
  // ボタンを表示
  document.getElementById("apply-result-button").style.display = "inline-block";
}

function displayHitorinboEnvyResult({
  data,
  currentPoints,
  targetPoints,
  eventBonus
}) {
  const earnedPoints = data.earnedEventPoints;
  const totalPoints = currentPoints + earnedPoints;
  const remainingPoints = targetPoints - totalPoints;

  document.getElementById("results-content").innerHTML = `
    ✅ <strong>独りんぼエンヴィーで目標のイベントPに近づけましょう！</strong><br><br>
    🎵 楽曲: ${data.title}<br>
    💥 ライボ消費数: ${data.requiredLiveBonusUsed}<br>
    🔢 スコア: ${Math.floor(data.requiredScore).toLocaleString()} ～ ${Math.floor(data.requiredScore + 19999).toLocaleString()}<br>
    🎁 獲得イベントP: ${earnedPoints.toLocaleString()} P<br>
    📈 獲得後の累計イベントP: ${totalPoints.toLocaleString()} P<br>
    🎯 目標までのイベントP: ${remainingPoints.toLocaleString()} P<br>
    💡 イベントボーナス: ${eventBonus} %
  `;
  // ボタンを表示
  document.getElementById("apply-result-button").style.display = "inline-block";
}

function findValidFallbackSongData({
  title,
  difficultyName,
  teamData,
  musicInfo,
  liveData,
  scoreMarginMultiplier,
  remainingEventPoints,
  eventBonus,
  bufferPoints,
  liveMode,
  maxLiveBonusUsed,
  eventType,
  encoreSkillNumber
}) {
  const scoreInfo = calculateScore({
    title,
    difficultyName,
    teamData,
    encoreSkillNumber,
    musicInfo,
    liveData
  });

  const maxAllowedScore = Math.floor((scoreInfo.min * scoreMarginMultiplier) / 20000) * 20000;
  const songConst = getSongDataByTitle(title, musicInfo).songConst;

  for (let liveBonusUsed = maxLiveBonusUsed; liveBonusUsed >= 0; liveBonusUsed--) {
    for (let totalScore = maxAllowedScore; totalScore >= 0; totalScore -= 20000) {
      const eventPoints = calculateEventPoints({
        totalScore,
        eventBonus,
        songConst,
        liveMode,
        liveBonusUsed,
        eventType
      });

      if (remainingEventPoints > eventPoints + bufferPoints) {
        return {
          title,
          difficultyName,
          earnedEventPoints: eventPoints,
          requiredScore: totalScore,
          requiredLiveBonusUsed: liveBonusUsed,
          requiredScoreRatio: totalScore / scoreInfo.min
        };
      }
    }
  }

  return null;
}


function calculateMinAllowedEventBonus({
  remainingEventPoints,
  teamData,
  scoreMarginMultiplier,
  musicInfo,
  liveData,
  liveMode,
  eventType,
  encoreSkillNumber
}) {
  let minAllowedEventBonus = -1;

  const meltExpertScore = calculateScore({
    title: "メルト",
    difficultyName: "expert",
    teamData,
    encoreSkillNumber,
    musicInfo,
    liveData
  });

  const songConst = getSongDataByTitle("メルト", musicInfo).songConst;

  for (let eventBonus = 0; eventBonus <= 1000; eventBonus++) {
    const points = calculateEventPoints({
      totalScore: meltExpertScore.min * scoreMarginMultiplier,
      eventBonus,
      songConst,
      liveMode,
      liveBonusUsed: 0,
      eventType
    });

    if (points >= remainingEventPoints) {
      minAllowedEventBonus = eventBonus + Math.floor(remainingEventPoints / 50);
      break;
    }
  }
  if (minAllowedEventBonus === -1) {
    throw new Error("ポイント調整可能なイベントボーナスの最小値が見つかりませんでした。");
  }
  return minAllowedEventBonus;
}



function loadCSV(url) {
  return fetch(url)
    .then(res => res.text())
    .then(text => {
      const [headerLine, ...lines] = text.trim().split('\n');
      const headers = headerLine.split(',');

      return lines.map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((key, i) => {
          const value = values[i];

          // 数値に変換できるかチェックして変換
          row[key] = isNaN(value) ? value : Number(value);
        });
        return row;
      });
    });
}

function getNumberById(id) {
  return Number(document.getElementById(id).value);
} 

function calculateEventPoints({
  totalScore,
  eventBonus,
  songConst,
  liveMode,
  liveBonusUsed,
  eventType
}) {
  const eventTypeConst = getEventTypeConst(eventType);
  const liveBonusMultiplier = getLiveBonusMultiplier(liveBonusUsed);
  let eventPoints;

  if (liveMode === 'soloLive') {
    if (eventType === 'cheerfulLive') {
      throw new Error('ひとりでライブモードではチアフルイベントは存在しません。');
    }
    eventPoints = (100 + Math.floor(totalScore / 20000)) * (eventBonus + 100) / 100;
    eventPoints = roundDown(eventPoints, 1) * songConst / 100;
    eventPoints = Math.floor(eventPoints) * liveBonusMultiplier;
  } else if (liveMode === 'multiLive') {
    eventPoints = (123 + Math.floor(totalScore / 17000)) * (eventBonus + 100) / 100;
    eventPoints = roundDown(eventPoints, 1) * songConst / 100;
    eventPoints = Math.floor(eventPoints) * eventTypeConst;
    eventPoints = Math.floor(eventPoints) * liveBonusMultiplier;
  } else {
    throw new Error(`無効なライブモード: ${liveMode}`);
  }

  return eventPoints;
}


function getEventTypeConst(eventType) {
  let eventTypeConst;
  if (eventType === 'marathon') {
    eventTypeConst = 1;
  } else if (eventType === 'cheerfulLive') {
    eventTypeConst = 1.35;
  } else {
    throw new Error(`無効なイベント形式: ${eventType}`);
  }
  return eventTypeConst;
}

function getLiveBonusMultiplier(liveBonusUsed) {
  const liveBonusMultiplierTable = {
    0: 1,
    1: 5,
    2: 10,
    3: 15,
    4: 20,
    5: 25,
    6: 27,
    7: 29,
    8: 31,
    9: 33,
    10: 35
  };

  if (!(liveBonusUsed in liveBonusMultiplierTable)) {
    throw new Error(`無効なライブボーナス消費数: ${liveBonusUsed}`);
  }

  return liveBonusMultiplierTable[liveBonusUsed];
}

function roundDown(num, digit) {
  return Math.floor(num * (10 ** digit)) / (10 ** digit);
}

// 残りのポイントと獲得ポイントが一致する可能性がある楽曲定数を抽出
function getValidSongConstMatches({
  remainingEventPoints,
  eventBonus,
  liveMode,
  eventType,
  maxLiveBonusUsed
}) {
  const validSongConstMatches =[];
  for (let songConst = 100; songConst <= 130; songConst++) {
    let found = false;

    for (let totalScore = 0; totalScore <= 3000000 && !found; totalScore += 20000) {
      for (let liveBonusUsed = 0; liveBonusUsed <= maxLiveBonusUsed && !found; liveBonusUsed++){
        const eventPoints = calculateEventPoints({
          totalScore: totalScore,
          eventBonus: eventBonus,
          songConst: songConst,
          liveMode: liveMode,
          liveBonusUsed: liveBonusUsed,
          eventType: eventType
        });

        if (eventPoints === remainingEventPoints) {
          validSongConstMatches.push({
            songConst,
            totalScore,
            liveBonusUsed
          });
          found = true;
        }
      }
    }
  }
  return validSongConstMatches;
}

function getSongDataByTitle(title, musicInfo) {
  const songData = musicInfo.find(row => row["楽曲名"] === title);
  if (!songData) {
    throw new Error(`無効な楽曲名： ${title}`);
  }
  return {
    songId: songData["楽曲ID"],
    songConst: songData["楽曲定数"],
    chartLevels: {
      easy: songData["Lv.Ea"],
      normal: songData["Lv.No"],
      hard: songData["Lv.Ha"],
      expert: songData["Lv.Ex"],
      master: songData["Lv.Ma"],
      append: songData["Lv.Ap"],
    }
  };
}

function getNoteWeight(songId, liveData) {
  const noteWeight = {};

  for (let difficultyId = 1; difficultyId <= 6; difficultyId++) {
    const row = liveData.find(
      r => r["楽曲ID"] === songId && r["難易度ID"] === difficultyId
    );
    if (!row) continue;

    const difficultyName = getDifficultyName(difficultyId);
    if (!difficultyName) continue;

    noteWeight[difficultyName] = {
      totalBaseWeight: row["累計基礎係数"],
      skill1: row["s1係数"],
      skill2: row["s2係数"],
      skill3: row["s3係数"],
      skill4: row["s4係数"],
      skill5: row["s5係数"],
      skill6: row["s6係数"],
      nonSkill: row["s外係数"],
      nonSkillBeforeSkill6: row["s6前s外係数"]
    };
  }

  return noteWeight;
}

function getDifficultyName(difficultyId) {
  const difficultyMap = {
    1: "easy",
    2: "normal",
    3: "hard",
    4: "expert",
    5: "master",
    6: "append"
  };

  return difficultyMap[difficultyId] || null; // 該当しないIDには null
}

function calculateScore({
  title,
  difficultyName,
  teamData,
  encoreSkillNumber,
  musicInfo,
  liveData,
  multiLiveTotalTalent = 0
}) {
  const encoreSkillIndex  = encoreSkillNumber - 1;
  const songData = getSongDataByTitle(title, musicInfo);
  const noteWeight = getNoteWeight(songData.songId, liveData);
  const noteWeightByDifficulty = noteWeight[difficultyName];
  const chartLevel = songData.chartLevels[difficultyName];

  if (chartLevel === undefined) {
    throw new Error(`無効な難易度名: ${difficultyName}`);
  }

  const fixedNoteWeights = [
    noteWeightByDifficulty.skill1,
    noteWeightByDifficulty.skill2,
    noteWeightByDifficulty.skill3,
    noteWeightByDifficulty.skill4,
    noteWeightByDifficulty.skill5
  ];

  const skillPermutations = getPermutations(teamData.skills);
  
  const multiLiveTalentBonusScore = Math.floor(multiLiveTotalTalent * 0.015) * 5 // マルチライブ時の合計総合力によるボーナススコア（ソロ時は 0）

  let scores = [];
  let max = -Infinity;
  let min = Infinity;
  let bestSkillOrder = null;

  for (const permutedSkills of skillPermutations) {
    const skillAdjustedTotalWeight = permutedSkills.reduce(
      (sum, skill, i) => sum + fixedNoteWeights[i] * (skill + 100) / 100,
      0
    ) + noteWeightByDifficulty.skill6 * (teamData.skills[encoreSkillIndex] + 100) / 100
      + noteWeightByDifficulty.nonSkill;

    const score = 4 * teamData.talent * (1 + (chartLevel - 5) * 0.005)
                * skillAdjustedTotalWeight / noteWeightByDifficulty.totalBaseWeight + multiLiveTalentBonusScore;

    scores.push(score);

    if (score > max) {
      max = score;
      bestSkillOrder = [...permutedSkills];
    }

    if (score < min) {
      min = score;
    }
  }

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  return {
    average,
    max,
    min,
    bestSkillOrder
  };
}


// 指定した配列の全ての順列（並び替え）を返す
function getPermutations(array) {
  if (array.length === 1) return [array];

  const result = [];

  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    const remaining = array.slice(0, i).concat(array.slice(i + 1));
    const remainingPerms = getPermutations(remaining);
    for (const perm of remainingPerms) {
      result.push([current, ...perm]);
    }
  }

  return result;
}

// 条件を満たす楽曲を抽出
function extractmatchingSongs({
  validSongConstMatches,
  musicInfo,
  liveData,
  teamData,
  maxLevel,
  encoreSkillNumber,
  scoreMarginMultiplier
}) {
  let matchingSongs = [];
  const validConsts = new Set(validSongConstMatches.map(match => match.songConst)); // validSongConstMatchesからconstsのみを抽出
  const validSongs = musicInfo.filter(song =>
    validConsts.has(song["楽曲定数"])
  );
  for (const song of validSongs){
    // 該当する楽曲の楽曲定数を用いてalidSongConstMatches から 必要なスコアとライブボーナス消費数を抽出
    const match = validSongConstMatches.find(
      m => m.songConst === song["楽曲定数"]
    );
    const requiredScore = match ? match.totalScore : null;
    const requiredLiveBonusUsed = match ? match.liveBonusUsed : null;

    for (let difficultyNameId = 5; difficultyNameId >= 1; difficultyNameId--){
      const difficultyName = getDifficultyName(difficultyNameId);
      const songData = getSongDataByTitle(song["楽曲名"], musicInfo);
      const chartLevel = songData.chartLevels[difficultyName];
      if (chartLevel > maxLevel) continue;
      const totalScore = calculateScore({
        title: song["楽曲名"],
        difficultyName: difficultyName,
        teamData: teamData,
        encoreSkillNumber: encoreSkillNumber,
        musicInfo: musicInfo,
        liveData: liveData
      })
      const maxAllowedScore = totalScore.min * scoreMarginMultiplier
      if (requiredScore <= maxAllowedScore) {
        matchingSongs.push({
          title: song["楽曲名"],
          difficultyName: difficultyName,
          requiredScore: requiredScore,
          requiredLiveBonusUsed: requiredLiveBonusUsed,
          requiredScoreRatio: requiredScore / totalScore.min
        })
        break;
      }
    }
  }
  return matchingSongs;
}

// matchingSongs から 再生時間が最も短い楽曲を抽出
function getShortestDurationSong(matchingSongs, musicInfo) {
  return matchingSongs.reduce((minSong, currentSong) => {
    const songInfo = musicInfo.find(info => info["楽曲名"] === currentSong.title);
    if (!songInfo || songInfo["再生時間"] == null) return minSong;

    const duration = songInfo["再生時間"];
    if (minSong === null || duration < minSong.duration) {
      return { ...currentSong, duration };
    }
    return minSong;
  }, null);
}

function applyResult() {
  const resultsContent = document.getElementById("results-content");
  if (!resultsContent) return;

  const match = resultsContent.innerHTML.match(/獲得イベントP:\s*([\d,]+) P/);
  if (!match) {
    alert("獲得イベントPが見つかりませんでした。");
    return;
  }

  const earnedPoints = Number(match[1].replace(/,/g, ""));
  const currentInput = document.getElementById("current-event-points");
  currentInput.value = Number(currentInput.value) + earnedPoints;

  // オマケ：再計算ボタンを自動で押すなら
  main();
}