export function test200() {
  return usePost('/', {});
}

export function test401() {
  return usePost('/401', {});
}

export function test500() {
  return usePost('/500', {});
}

export function testPut() {
  return usePost('/test', {});
}

export function testPost() {
  return usePost('/test', {});
}

export function testDelete() {
  return usePost('/test', {});
}
