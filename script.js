const genUI = () => {
  const notAllowed = document.querySelector('.notAllowed');
  notAllowed.style.display = 'none';

  const content = document.querySelector('.content');
  content.style.display = 'block';

  const resultTable = document.querySelector('.resultTable');
  fetch("https://tinchi.neu.edu.vn/DangKyHocPhan/KetQuaDangKy/1")
    .then(res => res.text())
    .then((data) => {
      resultTable.innerHTML = data;
    })
}

const getSubjectIDsStorage = () => {
  subjectIDs = JSON.parse(localStorage.getItem('subjectIDs'));
  if (!subjectIDs) {
    return [];
  }
  return subjectIDs;
}

const addSubjectIDsStorage = (subjectID) => {
  const subjectIDs = getSubjectIDsStorage();
  if (!subjectIDs.includes(subjectID))
    subjectIDs.push(subjectID);
  localStorage.setItem('subjectIDs', JSON.stringify(subjectIDs));
}

const clearSubjectIDsStorage = () => {
  localStorage.removeItem('subjectIDs');
}

const removeSubjectIDStorage = (subjectID) => {
  const subjectIDs = getSubjectIDsStorage();
  const newSubjectIDs = subjectIDs.filter((id) => id !== subjectID);
  localStorage.setItem('subjectIDs', JSON.stringify(newSubjectIDs));
}

const genCookie = () => {
  try { 
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab.url || !currentTab.url.includes("tinchi.neu.edu.vn")) return;
  
      chrome.cookies.getAll({name: "UserID"}, (ID) => {
        sessionStorage.setItem("MSV", ID[0].value);
      })
    });
    return true;
  } catch (error) {
    console.log("genCookie err:::",error);
    return false;
  }
}

const createStatusTable = () => {
  const subjectIDs = getSubjectIDsStorage();
  const statusTable = document.querySelector("#statusTableBody");
  statusTable.innerHTML = "";
    
  subjectIDs.forEach((subjectID) => {
    const html = `
      <tr data-id="${subjectID}">
        <td>${subjectID}</td>
        <td data-id="${subjectID}">Đang chờ...</td>
        <td><button class="removeBtn" data-id="${subjectID}">Xoá bỏ</button></td>
      </tr>
    `;
    statusTable.innerHTML += html;
  })

  const removeBtns = document.querySelectorAll(".removeBtn");
  removeBtns.forEach((removeBtn) => {
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const subjectID = removeBtn.getAttribute("data-id");
      removeSubjectIDStorage(subjectID);
      reloadUI();
    })
  })
}

const reloadUI = () => {
  clearInterval(interval);
  genUI();
  createStatusTable();
  solve();
}

const fetchWithHandleTimeout = (URL, TIMEOUT) => {
  let response = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(URL, {
        signal: controller.signal
      }).then((res) => res.json());
      return response;
    } catch (error) {
      return error;
    } finally {
      clearTimeout(timeoutId);
    }
  })().then((res) => res);
  return response;
}

let interval;
const solve = () => {
  clearInterval(interval);

  interval = setInterval(() => {
    const subjectIDs = getSubjectIDsStorage();
    subjectIDs.forEach((subjectID) => {
      var link = `https://tinchi.neu.edu.vn/DangKyHocPhan/DangKy?Hide=${subjectID}$0.0$${subjectID.split('_')[0]}$$0&acceptConflict=true&classStudyUnitConflictId=&RegistType=KH`;
      console.log(link);

      const res = fetchWithHandleTimeout(link, 3000);
      res
        .then((data) => {
          const message = data.Msg;
          console.log(message);
          if (message.includes('đã đủ số lượng')) {
            document.querySelector(`td[data-id="${subjectID}"]`).innerHTML = "Đã đủ số lượng, đang spam request đăng kí...";
          } else if (message.includes("Trùng lịch")) {
            document.querySelector(`td[data-id="${subjectID}"]`).innerHTML = "Trùng lịch";
          } else if (message.includes("Vượt")) {
            document.querySelector(`td[data-id="${subjectID}"]`).innerHTML = "Vượt số tín chỉ cho phép";
          } else {
            document.querySelector(`td[data-id="${subjectID}"]`).innerHTML = message;
            removeSubjectIDStorage(subjectID);
          }
        })
        .catch((err) => {
          console.log(err);
        })
    })
  }, 3000)
}

window.onload = async () => {
  const currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
  if (!currentTab.url || !currentTab.url.includes("tinchi.neu.edu.vn")) return;

  if (!genCookie) return;
  
  reloadUI();
  
  const subjectIDs = getSubjectIDsStorage();

  const runBtn = document.querySelector("#runBtn");
  const stopBtn = document.querySelector("#stopBtn");

  runBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // clearSubjectIDsStorage();
    const getSubjectIDs = document.querySelector("textarea")?.value?.split("\n");
    if (!getSubjectIDs) return;

    getSubjectIDs.forEach((subjectID) => {
      if (subjectID === "") return;
      addSubjectIDsStorage(subjectID);
    })

    document.querySelector("textarea").value = "";

    reloadUI();
  })

  stopBtn.addEventListener("click", () => {
    clearSubjectIDsStorage();
    reloadUI();
    clearInterval(interval);
  })

  const reloadResultBtn = document.querySelector("#reloadResultBtn");
  reloadResultBtn.addEventListener("click", () => {
    const resultTable = document.querySelector('.resultTable');
    resultTable.innerHTML = "";
    genUI();
  })

  const searchBtn = document.querySelector("#searchSubjectBtn");
  searchBtn.addEventListener("click", () => {
    const type = document.querySelector("select").value;
    const keyword = document.querySelector("input").value;
    const data = new URLSearchParams();
    data.append("ddlMonHoc", type);
    data.append("txtSearch", keyword);

    console.log(Object.fromEntries(data)); // Kiểm tra xem data đã đúng chưa

    const link = "https://tinchi.neu.edu.vn/TraCuuHocPhan";

    fetch(link, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: data.toString(), // Chuyển đối tượng data thành chuỗi
    })
      .then((res) => res.text())
      .then((data) => {
        const searchResult = document.querySelector(".searchSubjectResult");
        
        const parse = new DOMParser();
        const doc = parse.parseFromString(data, "text/html");

        const table = doc.querySelector("table");
        if (table) {
          searchResult.innerHTML = "";
          searchResult.appendChild(table);
        } else {
          searchResult.innerHTML = "Không tìm thấy kết quả";
        }
      });
  })

  const hideSearchResultBtn = document.querySelector("#hideResultSearch");
  if (hideSearchResultBtn) {
    hideSearchResultBtn.addEventListener("click", () => {
      const searchResult = document.querySelector(".searchSubjectResult");
      searchResult.classList.toggle("show");
    })
  }
}