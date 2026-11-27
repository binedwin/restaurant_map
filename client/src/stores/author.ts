import { defineStore } from "pinia";
import { ref } from "vue";

const TOKEN_KEY = "matzip.authorToken";
const NICK_KEY = "matzip.nickname";

const randomToken = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
};

/** 로그인 대신 브라우저마다 임의 토큰을 만들어 보관한다. 같은 브라우저에서 쓴 후기만 수정·삭제할 수 있다. */
function readOrCreateToken(): string {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && saved.length >= 16) return saved;
    const fresh = randomToken();
    localStorage.setItem(TOKEN_KEY, fresh);
    return fresh;
  } catch {
    return randomToken();
  }
}

export const useAuthorStore = defineStore("author", () => {
  const token = ref(readOrCreateToken());
  const nickname = ref("");
  try {
    nickname.value = localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    /* localStorage 를 못 쓰는 환경 */
  }

  function setNickname(name: string) {
    nickname.value = name;
    try {
      localStorage.setItem(NICK_KEY, name);
    } catch {
      /* ignore */
    }
  }

  return { token, nickname, setNickname };
});
