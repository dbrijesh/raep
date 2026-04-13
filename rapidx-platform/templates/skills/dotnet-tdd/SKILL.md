# Skill: .NET / C# TDD

## Purpose
Guide test-driven development practices for C# and .NET projects using xUnit, NUnit, MSTest, Moq, FluentAssertions, and integration testing with WebApplicationFactory.

## When to use
Active whenever the backend is C# / .NET. Extends the universal `tdd-workflow` skill with .NET-specific tooling and patterns.

## Key patterns

### Test project structure
- One test project per application project: `MyApp.Tests.Unit`, `MyApp.Tests.Integration`
- Mirror the source project's namespace structure in test projects
- Use xUnit as the default test framework (best async support, no static state)
- Keep unit tests fast (<10ms each) — no I/O, no real dependencies

### Unit testing with xUnit + Moq
```csharp
public class OrderServiceTests
{
    private readonly Mock<IOrderRepository> _repoMock = new();
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        _sut = new OrderService(_repoMock.Object);
    }

    [Fact]
    public async Task CreateOrder_ValidInput_ReturnsOrderId()
    {
        // Arrange
        _repoMock.Setup(r => r.SaveAsync(It.IsAny<Order>())).ReturnsAsync(42);

        // Act
        var result = await _sut.CreateOrderAsync(new CreateOrderRequest(...));

        // Assert
        result.Should().Be(42);
        _repoMock.Verify(r => r.SaveAsync(It.IsAny<Order>()), Times.Once);
    }
}
```

### Integration testing with WebApplicationFactory
- Use `WebApplicationFactory<Program>` to spin up the real ASP.NET Core pipeline in memory
- Override services with test doubles using `builder.ConfigureTestServices(...)`
- Use `Testcontainers` for real database integration tests
- Clean up test data after each test — use transactions or truncate tables

### FluentAssertions
- Prefer FluentAssertions over Assert.* for readable failure messages
- `result.Should().BeEquivalentTo(expected)` for object graph comparison
- `act.Should().ThrowAsync<InvalidOperationException>()` for exception assertions

### Coverage targets
- Unit test coverage: ≥80% on business logic (Services, Domain)
- Integration test coverage: all API endpoints must have at least one happy-path test
- Use `coverlet` + `ReportGenerator` in CI
