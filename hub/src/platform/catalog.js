// Stage 1 catalogue describes intended product UX. It is NOT an authorization policy.
// Never use these display flags to grant access to private company data.
export const HUB_CONTENT = Object.freeze({
  company: Object.freeze({ key:'company', name:'회사 관리', description:'멤버, 계좌, 자산 등 회사 운영 공간', phase:'existing' }),
  build: Object.freeze({ key:'build', name:'개조서 세팅', description:'개조서를 미리 조합해 보는 서비스', phase:'integration-pending', defaultFree:true }),
  cook: Object.freeze({ key:'cook', name:'요리 계산기', description:'요리 제작에 필요한 재료와 수량을 계산하는 서비스', phase:'planned' }),
});
